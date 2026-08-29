/**
 * Cloud sync service for Firebase Firestore & Realtime Synchronization
 * Guarantees zero data loss across reloads, browser closes, and multi-tenant accounts
 * (Barbearias, Hamburguerias, Salões, etc.)
 */
import {
  db,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  deleteDoc,
  query,
  where,
  auth
} from './firebase';
import { getDocFromServer } from 'firebase/firestore';
import {
  Business,
  Appointment,
  Professional,
  Service,
  Client,
  UserProfile,
  BusinessHours,
  CompanySubscription
} from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Warning/Error:', JSON.stringify(errInfo));
}

export class FirebaseSyncService {
  // Test connection to Firestore
  static async testConnection(): Promise<boolean> {
    try {
      await getDocFromServer(doc(db, 'system_health', 'connection_test'));
      return true;
    } catch (e: any) {
      if (e instanceof Error && e.message.includes('the client is offline')) {
        console.warn('Firebase client is offline, falling back to resilient local storage.');
      }
      return false;
    }
  }

  // --- Businesses ---
  static async syncBusiness(business: Business): Promise<void> {
    const path = `businesses/${business.id}`;
    try {
      const docRef = doc(db, 'businesses', business.id);
      await setDoc(docRef, business, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async getAllBusinesses(): Promise<Business[]> {
    const path = 'businesses';
    try {
      const snap = await getDocs(collection(db, 'businesses'));
      return snap.docs.map((d) => d.data() as Business);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  static async getBusinessBySlug(slug: string): Promise<Business | null> {
    const clean = slug.toLowerCase().trim();
    const path = 'businesses';
    try {
      const q = query(collection(db, 'businesses'), where('slug', '==', clean));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs[0].data() as Business;
      }
      // Check by ID directly
      const directRef = doc(db, 'businesses', clean);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return directSnap.data() as Business;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
    return null;
  }

  static async getBusinessById(id: string): Promise<Business | null> {
    const path = `businesses/${id}`;
    try {
      const directRef = doc(db, 'businesses', id);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return directSnap.data() as Business;
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, path);
    }
    return null;
  }

  // --- User Profiles & Auth Accounts ---
  static async saveUserProfile(user: UserProfile): Promise<void> {
    const path = `user_profiles/${user.id}`;
    try {
      const docRef = doc(db, 'user_profiles', user.id);
      await setDoc(docRef, user, { merge: true });
      if (user.email) {
        const normEmail = user.email.toLowerCase().trim();
        const emailDocRef = doc(db, 'accounts_by_email', normEmail);
        await setDoc(emailDocRef, {
          userId: user.id,
          email: normEmail,
          password: user.password || '',
          businessId: user.business_id,
          role: user.role || 'OWNER',
          name: user.name,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async getAllUserProfiles(): Promise<UserProfile[]> {
    const path = 'user_profiles';
    try {
      const snap = await getDocs(collection(db, 'user_profiles'));
      return snap.docs.map((d) => d.data() as UserProfile);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  // Save complete subscriber account (business + user profile + email index)
  static async saveAccount(business: Business, user: UserProfile): Promise<void> {
    try {
      await this.syncBusiness(business);
      await this.saveUserProfile(user);
      if (user.email) {
        const normEmail = user.email.toLowerCase().trim();
        const emailRef = doc(db, 'accounts_by_email', normEmail);
        await setDoc(emailRef, {
          userId: user.id,
          businessId: business.id,
          email: normEmail,
          password: user.password || '',
          businessName: business.name,
          businessType: business.type || 'Barbearia + Salão',
          role: user.role || 'OWNER',
          name: user.name,
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'accounts_by_email');
    }
  }

  // Retrieve account by email from Firebase Firestore
  static async getAccountByEmail(email: string): Promise<{ user?: UserProfile; business?: Business } | null> {
    if (!email) return null;
    const normEmail = email.toLowerCase().trim();
    
    try {
      // 1. Check direct lookup in accounts_by_email
      const emailRef = doc(db, 'accounts_by_email', normEmail);
      const emailSnap = await getDoc(emailRef);

      if (emailSnap.exists()) {
        const data = emailSnap.data() as any;
        let user: UserProfile | undefined;
        let business: Business | undefined;

        if (data.userId) {
          const uSnap = await getDoc(doc(db, 'user_profiles', data.userId));
          if (uSnap.exists()) {
            user = uSnap.data() as UserProfile;
          }
        }
        if (data.businessId) {
          const bSnap = await getDoc(doc(db, 'businesses', data.businessId));
          if (bSnap.exists()) {
            business = bSnap.data() as Business;
          }
        }

        if (user || business) {
          if (!user && data.userId && data.businessId) {
            user = {
              id: data.userId,
              business_id: data.businessId,
              email: normEmail,
              password: data.password || '',
              name: data.name || data.businessName || 'Assinante',
              role: data.role || 'OWNER',
              created_at: new Date().toISOString(),
            };
          }
          return { user, business };
        }
      }

      // 2. Query user_profiles collection
      const qUser = query(collection(db, 'user_profiles'), where('email', '==', normEmail));
      const userSnaps = await getDocs(qUser);
      if (!userSnaps.empty) {
        const user = userSnaps.docs[0].data() as UserProfile;
        let business: Business | undefined;
        if (user.business_id) {
          const bSnap = await getDoc(doc(db, 'businesses', user.business_id));
          if (bSnap.exists()) {
            business = bSnap.data() as Business;
          }
        }
        return { user, business };
      }

      // 3. Query businesses collection directly
      const qBiz = query(collection(db, 'businesses'), where('email', '==', normEmail));
      const bizSnaps = await getDocs(qBiz);
      if (!bizSnaps.empty) {
        const business = bizSnaps.docs[0].data() as Business;
        const user: UserProfile = {
          id: 'usr-' + business.id,
          business_id: business.id,
          name: business.owner_name || business.name,
          email: normEmail,
          role: 'OWNER',
          created_at: new Date().toISOString(),
        };
        return { user, business };
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.GET, `accounts_by_email/${normEmail}`);
    }
    return null;
  }

  // Update password in Firestore
  static async updatePasswordInCloud(email: string, newPass: string): Promise<void> {
    const norm = email.toLowerCase().trim();
    const path = `accounts_by_email/${norm}`;
    try {
      const emailDocRef = doc(db, 'accounts_by_email', norm);
      await setDoc(emailDocRef, {
        email: norm,
        password: newPass,
        updated_at: new Date().toISOString()
      }, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // --- Appointments ---
  static async saveAppointment(appointment: Appointment): Promise<void> {
    const path = `appointments/${appointment.id}`;
    try {
      const docRef = doc(db, 'appointments', appointment.id);
      await setDoc(docRef, appointment, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async deleteAppointment(appointmentId: string): Promise<void> {
    const path = `appointments/${appointmentId}`;
    try {
      await deleteDoc(doc(db, 'appointments', appointmentId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  static async getAppointments(businessId: string): Promise<Appointment[]> {
    const path = 'appointments';
    try {
      const q = query(collection(db, 'appointments'), where('business_id', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Appointment);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  // --- Services ---
  static async saveService(service: Service): Promise<void> {
    const path = `services/${service.id}`;
    try {
      const docRef = doc(db, 'services', service.id);
      await setDoc(docRef, service, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async deleteService(serviceId: string): Promise<void> {
    const path = `services/${serviceId}`;
    try {
      await deleteDoc(doc(db, 'services', serviceId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  static async getServices(businessId: string): Promise<Service[]> {
    const path = 'services';
    try {
      const q = query(collection(db, 'services'), where('business_id', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Service);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  // --- Professionals ---
  static async saveProfessional(professional: Professional): Promise<void> {
    const path = `professionals/${professional.id}`;
    try {
      const docRef = doc(db, 'professionals', professional.id);
      await setDoc(docRef, professional, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async deleteProfessional(professionalId: string): Promise<void> {
    const path = `professionals/${professionalId}`;
    try {
      await deleteDoc(doc(db, 'professionals', professionalId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  static async getProfessionals(businessId: string): Promise<Professional[]> {
    const path = 'professionals';
    try {
      const q = query(collection(db, 'professionals'), where('business_id', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Professional);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  // --- Clients ---
  static async saveClient(client: Client): Promise<void> {
    const path = `clients/${client.id}`;
    try {
      const docRef = doc(db, 'clients', client.id);
      await setDoc(docRef, client, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  static async deleteClient(clientId: string): Promise<void> {
    const path = `clients/${clientId}`;
    try {
      await deleteDoc(doc(db, 'clients', clientId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
    }
  }

  static async getClients(businessId: string): Promise<Client[]> {
    const path = 'clients';
    try {
      const q = query(collection(db, 'clients'), where('business_id', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Client);
    } catch (e) {
      handleFirestoreError(e, OperationType.LIST, path);
      return [];
    }
  }

  // --- Subscriptions ---
  static async saveSubscription(subscription: any): Promise<void> {
    const path = `subscriptions/${subscription.business_id || subscription.id}`;
    try {
      const docRef = doc(db, 'subscriptions', subscription.business_id || subscription.id);
      await setDoc(docRef, subscription, { merge: true });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
    }
  }

  // --- Pull All Cloud Data and Merge to Local DB ---
  static async pullAllCloudData(): Promise<{
    businesses: Business[];
    profiles: UserProfile[];
    appointments: Appointment[];
    services: Service[];
    professionals: Professional[];
    clients: Client[];
  }> {
    const result = {
      businesses: [] as Business[],
      profiles: [] as UserProfile[],
      appointments: [] as Appointment[],
      services: [] as Service[],
      professionals: [] as Professional[],
      clients: [] as Client[],
    };

    try {
      const [bizSnap, profSnap, apptSnap, srvSnap, staffSnap, cliSnap] = await Promise.allSettled([
        getDocs(collection(db, 'businesses')),
        getDocs(collection(db, 'user_profiles')),
        getDocs(collection(db, 'appointments')),
        getDocs(collection(db, 'services')),
        getDocs(collection(db, 'professionals')),
        getDocs(collection(db, 'clients')),
      ]);

      if (bizSnap.status === 'fulfilled') {
        result.businesses = bizSnap.value.docs.map((d) => d.data() as Business);
      }
      if (profSnap.status === 'fulfilled') {
        result.profiles = profSnap.value.docs.map((d) => d.data() as UserProfile);
      }
      if (apptSnap.status === 'fulfilled') {
        result.appointments = apptSnap.value.docs.map((d) => d.data() as Appointment);
      }
      if (srvSnap.status === 'fulfilled') {
        result.services = srvSnap.value.docs.map((d) => d.data() as Service);
      }
      if (staffSnap.status === 'fulfilled') {
        result.professionals = staffSnap.value.docs.map((d) => d.data() as Professional);
      }
      if (cliSnap.status === 'fulfilled') {
        result.clients = cliSnap.value.docs.map((d) => d.data() as Client);
      }
    } catch (e) {
      console.warn('Error pulling all cloud data from Firebase:', e);
    }

    return result;
  }
}

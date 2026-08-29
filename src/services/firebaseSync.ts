/**
 * Cloud sync service for Firebase Firestore & Realtime Synchronization
 */
import { db, doc, getDoc, setDoc, getDocs, collection, query, where } from './firebase';
import { Business, Appointment, Professional, Service, Client, UserProfile } from '../types';

export class FirebaseSyncService {
  // Sync business to Firestore
  static async syncBusiness(business: Business): Promise<void> {
    try {
      const docRef = doc(db, 'businesses', business.id);
      await setDoc(docRef, business, { merge: true });
    } catch (e) {
      console.warn('Firebase syncBusiness error:', e);
    }
  }

  // Fetch business by slug or ID
  static async getBusinessBySlug(slug: string): Promise<Business | null> {
    try {
      const clean = slug.toLowerCase().trim();
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
      console.warn('Firebase getBusinessBySlug error:', e);
    }
    return null;
  }

  // Get business by ID
  static async getBusinessById(id: string): Promise<Business | null> {
    try {
      const directRef = doc(db, 'businesses', id);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) {
        return directSnap.data() as Business;
      }
    } catch (e) {
      console.warn('Firebase getBusinessById error:', e);
    }
    return null;
  }

  // Save complete subscriber account (business + user profile)
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
          role: user.role || 'OWNER',
          updated_at: new Date().toISOString(),
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Firebase saveAccount error:', e);
    }
  }

  // Retrieve account by email from Firebase Firestore
  static async getAccountByEmail(email: string): Promise<{ user?: UserProfile; business?: Business } | null> {
    try {
      const normEmail = email.toLowerCase().trim();
      
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
              password: data.password,
              name: data.businessName || 'Assinante',
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
      console.warn('Firebase getAccountByEmail error:', e);
    }
    return null;
  }

  // Save appointment directly to Firestore
  static async saveAppointment(appointment: Appointment): Promise<void> {
    try {
      const docRef = doc(db, 'appointments', appointment.id);
      await setDoc(docRef, appointment, { merge: true });
    } catch (e) {
      console.warn('Firebase saveAppointment error:', e);
    }
  }

  // Get appointments by business
  static async getAppointments(businessId: string): Promise<Appointment[]> {
    try {
      const q = query(collection(db, 'appointments'), where('business_id', '==', businessId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as Appointment);
    } catch (e) {
      console.warn('Firebase getAppointments error:', e);
      return [];
    }
  }

  // Save user profile
  static async saveUserProfile(user: UserProfile): Promise<void> {
    try {
      const docRef = doc(db, 'user_profiles', user.id);
      await setDoc(docRef, user, { merge: true });
      if (user.email) {
        const emailDocRef = doc(db, 'accounts_by_email', user.email.toLowerCase().trim());
        await setDoc(emailDocRef, {
          userId: user.id,
          email: user.email.toLowerCase().trim(),
          password: user.password || '',
          businessId: user.business_id,
          role: user.role || 'OWNER',
          name: user.name,
        }, { merge: true });
      }
    } catch (e) {
      console.warn('Firebase saveUserProfile error:', e);
    }
  }

  // Reset password in Firestore
  static async updatePasswordInCloud(email: string, newPass: string): Promise<void> {
    try {
      const norm = email.toLowerCase().trim();
      const emailDocRef = doc(db, 'accounts_by_email', norm);
      await setDoc(emailDocRef, { email: norm, password: newPass, updated_at: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.warn('Firebase updatePasswordInCloud error:', e);
    }
  }
}


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
        await setDoc(emailDocRef, { userId: user.id, email: user.email, password: user.password, businessId: user.business_id }, { merge: true });
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

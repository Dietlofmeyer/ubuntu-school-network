import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

export interface RegistrationToken {
  id?: string;
  token: string;
  email: string;
  role: "student" | "teacher" | "guardian" | "staff" | "admin";
  schoolId: string;
  createdBy: string;
  createdAt?: any; // Firestore Timestamp
  expiresAt: Date | any; // Date or Firestore Timestamp
  used: boolean;
  metadata?: {
    guardianId?: string; // For students
    grade?: string; // For students
    subjects?: string[]; // For teachers
    name?: string; // Pre-filled name
    schoolName?: string; // For school admin
    isSchoolAdmin?: boolean; // For school admin
  };
}

export class SecureRegistrationService {
  private static readonly COLLECTION_NAME = "registrationTokens";
  private static readonly TOKEN_EXPIRY_HOURS = 48; // 48 hours to complete registration

  /**
   * Generate a secure registration token
   */
  static generateToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  /**
   * Create a registration token for a user
   */
  static async createRegistrationToken(
    tokenData: Omit<RegistrationToken, "id" | "token" | "expiresAt" | "used">
  ): Promise<string> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const registrationToken: Omit<RegistrationToken, "id"> = {
      ...tokenData,
      token,
      expiresAt,
      used: false,
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, this.COLLECTION_NAME), registrationToken);
      return token;
    } catch (error) {
      console.error("Error creating registration token:", error);
      throw new Error("Failed to create registration token");
    }
  }

  /**
   * Validate and retrieve registration token
   */
  static async validateToken(token: string): Promise<RegistrationToken | null> {
    if (!token || token.length !== 64) {
      return null;
    }

    try {
      const q = query(
        collection(db, this.COLLECTION_NAME),
        where("token", "==", token),
        where("used", "==", false)
      );

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return null;
      }

      const tokenDoc = querySnapshot.docs[0];
      const tokenData = {
        id: tokenDoc.id,
        ...tokenDoc.data(),
      } as RegistrationToken;

      // Check if token has expired
      const now = new Date();
      const expiresAt =
        tokenData.expiresAt instanceof Date
          ? tokenData.expiresAt
          : tokenData.expiresAt.toDate();

      if (now > expiresAt) {
        // Clean up expired token
        await this.deleteToken(tokenDoc.id);
        return null;
      }

      return tokenData;
    } catch (error) {
      console.error("Error validating token:", error);
      return null;
    }
  }

  /**
   * Mark token as used
   */
  static async markTokenAsUsed(tokenId: string): Promise<void> {
    try {
      const tokenRef = doc(db, this.COLLECTION_NAME, tokenId);
      await deleteDoc(tokenRef);
    } catch (error) {
      console.error("Error marking token as used:", error);
      throw new Error("Failed to mark token as used");
    }
  }

  /**
   * Delete a registration token
   */
  static async deleteToken(tokenId: string): Promise<void> {
    try {
      const tokenRef = doc(db, this.COLLECTION_NAME, tokenId);
      await deleteDoc(tokenRef);
    } catch (error) {
      console.error("Error deleting token:", error);
      throw new Error("Failed to delete token");
    }
  }

  /**
   * Clean up expired tokens (should be called periodically)
   */
  static async cleanupExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const q = query(collection(db, this.COLLECTION_NAME));
      const querySnapshot = await getDocs(q);

      let deletedCount = 0;
      const deletePromises: Promise<void>[] = [];

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data() as RegistrationToken;
        const expiresAt =
          data.expiresAt instanceof Date
            ? data.expiresAt
            : data.expiresAt.toDate();

        if (now > expiresAt) {
          deletePromises.push(this.deleteToken(doc.id));
          deletedCount++;
        }
      });

      await Promise.all(deletePromises);
      return deletedCount;
    } catch (error) {
      console.error("Error cleaning up expired tokens:", error);
      return 0;
    }
  }

  /**
   * Generate registration URL
   */
  static generateRegistrationUrl(token: string, baseUrl?: string): string {
    const base = baseUrl || window.location.origin;
    return `${base}/register?token=${token}`;
  }

  /**
   * Send registration invitation (placeholder for email service)
   */
  static async sendRegistrationInvitation(
    email: string,
    token: string,
    role: string
  ): Promise<boolean> {
    // In a real implementation, you would integrate with an email service
    // The registration URL would be sent via secure email service

    // Registration invitation would be sent to: email
    // For user role: role
    // Using secure token: token

    // You could integrate with services like:
    // - SendGrid
    // - Mailgun
    // - AWS SES
    // - Firebase Functions with email templates

    return true;
  }

  /**
   * Create a school admin registration token after school approval
   */
  static async createSchoolAdminToken(
    schoolId: string,
    principalEmail: string,
    schoolName: string,
    createdBy: string
  ): Promise<string> {
    const tokenData = {
      email: principalEmail.toLowerCase(),
      role: "admin" as const,
      schoolId,
      createdBy,
      metadata: {
        schoolName,
        isSchoolAdmin: true,
      },
    };

    return this.createRegistrationToken(tokenData);
  }
}

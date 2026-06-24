// Shared application-level domain types.
export interface PlatformUser {
  id: string;
  email: string;
  walletAddress: string;
  tonBalance: number;
  usdtBalance: number;
  role: "super_admin" | "moderator" | "risk_analyst" | "financial_auditor" | "user";
  status: "active" | "banned";
  suspensionReason?: string;
  kycVerified: boolean;
  joinedDate: string;
}

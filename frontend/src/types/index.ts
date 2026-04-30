export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  requestId: string;
  timestamp: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  meta?: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export type ApiErrorResponse = {
  success?: boolean;
  statusCode?: number;
  message?: string | string[];
  path?: string;
  method?: string;
  requestId?: string;
  timestamp?: string;
};

export type UserRole = 'OWNER' | 'ADMIN' | 'STAFF' | 'TENANT';

export type PortalUserSummary = {
  portalUserId: number;
  portalEmail: string;
  portalIsActive: boolean;
  lastLoginAt: string | null;
  passwordChangedAt?: string | null;
};

export type AuthUser = {
  id: number;
  fullName: string;
  email: string;
  role: UserRole;
  tenantId: number | null;
  isActive: boolean;
  lastLoginAt?: string | null;
};

export type Tenant = {
  id: number;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  identityNumber?: string | null;
  gender?: string | null;
  birthDate?: string | null;
  originCity?: string | null;
  occupation?: string | null;
  companyOrCampus?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  notes?: string | null;
  isActive?: boolean;
  activeStayId?: number | null;
  currentStay?: Stay | null;
  portalUserSummary?: PortalUserSummary | null;
};

export type RoomFacility = {
  id: number;
  roomId: number;
  name: string;
  quantity: number;
  category?: string | null;
  publicVisible: boolean;
  condition?: string | null;
  note?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type Room = {
  id: number;
  code: string;
  name?: string | null;
  floor?: string | null;
  status: 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE' | string;
  dailyRateRupiah?: number | null;
  weeklyRateRupiah?: number | null;
  biWeeklyRateRupiah?: number | null;
  monthlyRateRupiah: number;
  defaultDepositRupiah?: number | null;
  electricityTariffPerKwhRupiah?: number | null;
  waterTariffPerM3Rupiah?: number | null;
  images?: string[];
  notes?: string | null;
  isActive?: boolean;
  activeStayId?: number | null;
  currentStay?: Stay | null;
  facilities?: RoomFacility[];
};

export type PricingTerm = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'SMESTERLY' | 'YEARLY' | string;
export type StayStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
export type DepositStatus = 'HELD' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FORFEITED' | string;

export type Stay = {
  id: number;
  tenantId: number;
  roomId: number;
  tenant?: Tenant | null;
  room?: Room | null;
  status: StayStatus;
  pricingTerm?: PricingTerm;
  agreedRentAmountRupiah?: number | null;
  depositAmountRupiah?: number | null;
  depositPaidAmountRupiah?: number | null;
  depositPaymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | string;
  depositDeductionRupiah?: number | null;
  depositRefundedRupiah?: number | null;
  depositStatus?: DepositStatus;
  checkInDate?: string;
  plannedCheckOutDate?: string | null;
  actualCheckOutDate?: string | null;
  expiresAt?: string | null;
  bookingSource?: string | null;
  bookingSourceDetail?: string | null;
  stayPurpose?: string | null;
  checkoutReason?: string | null;
  cancelReason?: string | null;
  notes?: string | null;
  electricityTariffPerKwhRupiah?: number | null;
  waterTariffPerM3Rupiah?: number | null;
  initialElectricityKwh?: number | string | null;
  initialWaterM3?: number | string | null;
  roomStatusAfterSync?: string;
  openInvoiceCount?: number;
  invoices?: Invoice[];
  invoiceCount?: number;
  latestInvoiceId?: number | null;
  latestInvoiceNumber?: string | null;
  latestInvoiceStatus?: InvoiceStatus | null;
  invoiceTotalAmountRupiah?: number | null;
  invoicePaidAmountRupiah?: number | null;
  invoiceRemainingAmountRupiah?: number | null;
};

export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'CANCELLED' | string;
export type InvoiceLineType = 'RENT' | 'ELECTRICITY' | 'WATER' | 'PENALTY' | 'DISCOUNT' | 'WIFI' | 'OTHER' | string;
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'QRIS' | 'EWALLET' | 'OTHER' | string;

export type InvoiceLine = {
  id: number;
  invoiceId?: number;
  lineType: InvoiceLineType;
  description?: string | null;
  qty?: number | string;
  unit?: string | null;
  unitPriceRupiah?: number;
  lineAmountRupiah?: number;
  sortOrder?: number;
};

export type Invoice = {
  id: number;
  stayId: number;
  invoiceNumber?: string | null;
  status: InvoiceStatus;
  periodStart?: string;
  periodEnd?: string;
  dueDate?: string | null;
  totalAmountRupiah?: number;
  paidAmountRupiah?: number;
  issuedAt?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  stay?: Stay | null;
  lines?: InvoiceLine[];
  payments?: InvoicePayment[];
};

export type InvoicePayment = {
  id: number;
  invoiceId: number;
  paymentDate?: string;
  amountRupiah: number;
  method: PaymentMethod;
  referenceNo?: string | null;
  note?: string | null;
};

export type MeterUtilityType = 'ELECTRICITY' | 'WATER' | string;

export type MeterReading = {
  id: number;
  roomId: number;
  utilityType: MeterUtilityType;
  readingAt: string;
  readingValue: number | string;
  note?: string | null;
};

export type MeterRow = {
  dateKey: string;
  readingAt: string;
  electricityKwh?: number;
  waterM3?: number;
  usageElectricityKwh?: number;
  usageWaterM3?: number;
};

export type InventoryItem = {
  id: number;
  sku?: string | null;
  name: string;
  category?: string | null;
  unit?: string | null;
  qtyOnHand?: number | string | null;
  minQty?: number | string | null;
  notes?: string | null;
  isActive?: boolean;
};

export type RoomItem = {
  id: number;
  roomId: number;
  itemId: number;
  qty?: number | string | null;
  status?: string | null;
  note?: string | null;
  item?: InventoryItem | null;
  room?: Room | null;
};

export type WifiSale = {
  id: number;
  saleDate?: string | null;
  customerName?: string | null;
  packageName?: string | null;
  soldPriceRupiah?: number | null;
  note?: string | null;
  tenantId?: number | null;
  stayId?: number | null;
};

export type InvoiceSuggestionItem = {
  lineType: InvoiceLineType;
  description: string;
  qty: number;
  unit?: string;
  unitPriceRupiah: number;
};

export type StayCreatePayload = {
  tenantId: number;
  roomId: number;
  pricingTerm: PricingTerm;
  checkInDate: string;
  agreedRentAmountRupiah: number;
  depositAmountRupiah?: number;
  plannedCheckOutDate?: string;
  bookingSource?: string;
  stayPurpose?: string;
  notes?: string;
  initialElectricityKwh: string;
  initialWaterM3: string;
};

export type CompleteStayPayload = {
  actualCheckOutDate: string;
  checkoutReason?: string;
  notes?: string;
};

export type CancelStayPayload = {
  cancelReason: string;
};

export type ProcessDepositPayload = {
  action: 'FULL_REFUND' | 'PARTIAL_REFUND' | 'FORFEIT';
  depositDeductionRupiah?: number;
  depositRefundedRupiah?: number;
  depositNote?: string;
};

export type Announcement = {
  id: number;
  title: string;
  content: string;
  audience: string;
  isPublished: boolean;
  isPinned: boolean;
  imageUrl?: string | null;
  imageFileKey?: string | null;
  imageOriginalFilename?: string | null;
  imageMimeType?: string | null;
  imageFileSizeBytes?: number | null;
  publishedAt?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
};


export type PublicRoom = {
  id: number;
  code: string;
  name?: string | null;
  floor?: string | null;
  status: string;
  notes?: string | null;
  images?: string[];
  isAvailable?: boolean;
  pricing: {
    dailyRateRupiah?: number | null;
    weeklyRateRupiah?: number | null;
    biWeeklyRateRupiah?: number | null;
    monthlyRateRupiah?: number | null;
  };
  defaultDepositRupiah?: number | null;
  electricityTariffPerKwhRupiah?: number | null;
  waterTariffPerM3Rupiah?: number | null;
  highlightedPricingTerm?: PricingTerm;
  highlightedRateRupiah?: number | null;
  availablePricingTerms?: PricingTerm[];
  facilities?: RoomFacility[];
};

export type TenantBooking = {
  id: number;
  tenantId: number;
  roomId: number;
  status: StayStatus;
  pricingTerm?: PricingTerm;
  agreedRentAmountRupiah?: number | null;
  checkInDate?: string;
  plannedCheckOutDate?: string | null;
  expiresAt?: string | null;
  depositAmountRupiah?: number | null;
  depositPaidAmountRupiah?: number | null;
  depositPaymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | string;
  electricityTariffPerKwhRupiah?: number | null;
  waterTariffPerM3Rupiah?: number | null;
  bookingSource?: string | null;
  stayPurpose?: string | null;
  notes?: string | null;
  createdById?: number | null;
  createdAt?: string;
  updatedAt?: string;
  tenant?: Pick<Tenant, 'id' | 'fullName' | 'phone' | 'email'> | null;
  room?: Pick<Room, 'id' | 'code' | 'name' | 'floor' | 'status'> | null;
  invoiceCount?: number;
  latestInvoiceId?: number | null;
  latestInvoiceNumber?: string | null;
  latestInvoiceStatus?: InvoiceStatus | null;
  invoiceTotalAmountRupiah?: number | null;
  invoicePaidAmountRupiah?: number | null;
  invoiceRemainingAmountRupiah?: number | null;
};

export type ApproveBookingPayload = {
  agreedRentAmountRupiah: number;
  depositAmountRupiah: number;
  initialElectricityKwh: string;
  initialWaterM3: string;
};

export type ApproveBookingResult = {
  stay: Stay;
  invoice: Pick<Invoice, 'id' | 'invoiceNumber' | 'status' | 'periodStart' | 'periodEnd' | 'dueDate'>;
  baselineMeters: {
    electricityId: number;
    waterId: number;
    readingAt: string;
  };
};

export type CreateTenantBookingPayload = {
  roomId: number;
  checkInDate: string;
  pricingTerm: PricingTerm;
  plannedCheckOutDate?: string;
  stayPurpose?: StayPurposeOption;
  notes?: string;
};

export type StayPurposeOption = 'WORK' | 'STUDY' | 'TRANSIT' | 'FAMILY' | 'MEDICAL' | 'PROJECT' | 'OTHER';

export type CreatePublicBookingPayload = {
  roomId: number;
  checkInDate: string;
  pricingTerm: PricingTerm;
  fullName: string;
  phone: string;
  email: string;
  identityNumber?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  plannedCheckOutDate?: string;
  stayPurpose?: StayPurposeOption;
  notes?: string;
  website?: string;
};

export type PublicBookingResult = {
  booking: {
    stayId: number;
    roomId: number;
    roomCode: string;
    status: string;
    expiresAt: string;
    checkInDate: string;
    pricingTerm: PricingTerm;
  };
  portalAccess: {
    email: string;
    temporaryPassword?: string | null;
    isNewUser: boolean;
    instructions: string;
  };
  message: string;
};


export type PaymentSubmissionStatus = 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | string;
export type PaymentTargetType = 'INVOICE' | 'DEPOSIT';

export type PaymentSubmission = {
  id: number;
  stayId: number;
  invoiceId: number;
  tenantId: number;
  amountRupiah: number;
  paidAt: string;
  paymentMethod: PaymentMethod;
  targetType?: PaymentTargetType;
  senderName?: string | null;
  senderBankName?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  fileKey?: string | null;
  fileUrl?: string | null;
  originalFilename?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  status: PaymentSubmissionStatus;
  reviewedAt?: string | null;
  reviewNotes?: string | null;
  createdAt?: string;
  updatedAt?: string;
  tenant?: Pick<Tenant, 'id' | 'fullName' | 'phone'> | null;
  room?: Pick<Room, 'id' | 'code' | 'name' | 'status'> | null;
  stay?: Pick<Stay, 'id' | 'status' | 'expiresAt'> | null;
  invoice?: {
    id: number;
    invoiceNumber?: string | null;
    status: InvoiceStatus;
    totalAmountRupiah?: number;
    paidAmountRupiah?: number;
    remainingAmountRupiah?: number;
  } | null;
  deposit?: {
    amountRupiah?: number | null;
    paidAmountRupiah?: number | null;
    remainingAmountRupiah?: number | null;
    paymentStatus?: 'UNPAID' | 'PARTIAL' | 'PAID' | string;
  } | null;
  submittedBy?: { id: number; fullName?: string | null } | null;
  reviewedBy?: { id: number; fullName?: string | null } | null;
};

export type CreatePaymentSubmissionPayload = {
  stayId: number;
  invoiceId: number;
  targetType: PaymentTargetType;
  amountRupiah: number;
  paidAt: string;
  paymentMethod: PaymentMethod;
  senderName?: string;
  senderBankName?: string;
  referenceNumber?: string;
  notes?: string;
  fileUrl?: string;
  fileKey?: string;
  originalFilename?: string;
  mimeType?: string;
  fileSizeBytes?: number;
};

export type ReviewQueueQuery = {
  page?: number;
  limit?: number;
  status?: PaymentSubmissionStatus;
  search?: string;
  paymentMethod?: PaymentMethod;
  roomId?: number | string;
  tenantId?: number | string;
};


export type Ticket = {
  id: number;
  ticketNumber?: string;
  title?: string;
  description?: string;
  category?: string;
  status: string;
  tenantId?: number;
  roomId?: number | null;
  stayId?: number | null;
  assignedToId?: number | null;
  resolutionNote?: string | null;
  issueImageUrl?: string | null;
  issueImageFileKey?: string | null;
  issueImageOriginalFilename?: string | null;
  issueImageMimeType?: string | null;
  issueImageFileSizeBytes?: number | null;
  resolutionImageUrl?: string | null;
  resolutionImageFileKey?: string | null;
  resolutionImageOriginalFilename?: string | null;
  resolutionImageMimeType?: string | null;
  resolutionImageFileSizeBytes?: number | null;
  tenant?: { id: number; fullName?: string; email?: string } | null;
  room?: { id: number; code?: string; name?: string } | null;
  createdAt?: string;
  updatedAt?: string;
};

export type RenewRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | string;

export type RenewRequest = {
  id: number;
  stayId: number;
  tenantId: number;
  requestedTerm: PricingTerm;
  requestedCheckOutDate?: string | null;
  status: RenewRequestStatus;
  requestNotes?: string | null;
  reviewNotes?: string | null;
  reviewedById?: number | null;
  reviewedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  stay?: {
    id: number;
    roomId: number;
    room?: { id: number; code?: string; name?: string } | null;
    checkInDate?: string;
    plannedCheckOutDate?: string | null;
    tenant?: { id: number; fullName?: string } | null;
  } | null;
  tenant?: { id: number; fullName?: string } | null;
  reviewedBy?: { id: number; fullName?: string } | null;
};

export type CreateRenewRequestPayload = {
  stayId: number;
  requestedTerm: PricingTerm;
  requestNotes?: string;
};

export type ApproveRenewRequestPayload = {
  plannedCheckOutDate?: string;
  agreedRentAmountRupiah?: number;
};

export type RejectRenewRequestPayload = {
  reviewNotes: string;
};

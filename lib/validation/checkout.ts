import { z } from "zod";

export const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Andaman and Nicobar Islands","Chandigarh","Dadra and Nagar Haveli and Daman and Diu","Delhi","Jammu and Kashmir","Ladakh","Lakshadweep","Puducherry",
] as const;

export const addressSchema = z.object({
  label: z.string().trim().max(30).optional().default("Home"),
  fullName: z.string().trim().min(2, "Enter the recipient's full name.").max(80),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number."),
  line1: z.string().trim().min(5, "Enter house number and street.").max(160),
  line2: z.string().trim().max(160).optional().or(z.literal("")),
  city: z.string().trim().min(2, "Enter a city.").max(60),
  state: z.enum(INDIAN_STATES, { message: "Select a state." }),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode."),
  isDefault: z.boolean().optional().default(false),
});
export type AddressInput = z.infer<typeof addressSchema>;

export const paymentDetailsSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("UPI"), upiId: z.string().trim().regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID, e.g. name@okaxis.") }),
  z.object({
    method: z.literal("CARD"),
    cardNumber: z.string().transform((v) => v.replace(/\s+/g, "")).pipe(z.string().regex(/^\d{13,19}$/, "Enter a valid card number.")),
    cardName: z.string().trim().min(2, "Enter the name on card."),
    expiry: z.string().trim().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Use MM/YY."),
    cvv: z.string().trim().regex(/^\d{3,4}$/, "Enter a valid CVV."),
  }),
  z.object({ method: z.literal("NET_BANKING"), bank: z.string().trim().min(2, "Select your bank.") }),
  z.object({ method: z.literal("COD") }),
  z.object({ method: z.literal("TEST"), outcome: z.enum(["success", "failure"]) }),
]);
export type PaymentDetails = z.infer<typeof paymentDetailsSchema>;

export const placeOrderSchema = z.object({
  addressId: z.string().min(1, "Select a delivery address."),
  deliveryMethod: z.enum(["STANDARD", "EXPRESS"]),
  usePoints: z.boolean().default(false),
  notes: z.string().trim().max(300).optional(),
  payment: paymentDetailsSchema,
});
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

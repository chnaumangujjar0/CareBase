import { z } from "zod";
import type { Tenant as PrismaTenant } from "../generated/prisma/client.js";

export type Tenant = Pick<
  PrismaTenant,
  | "id"
  | "name"
  | "slug"
  | "logo"
  | "favicon"
  | "address"
  | "city"
  | "state"
  | "country"
  | "postalCode"
>;

export type Char36 = string & { readonly __charLength: 36 };

export const char36Schema = z.string().length(36).transform((value) => value as Char36);
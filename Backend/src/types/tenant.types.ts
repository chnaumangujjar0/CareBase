export interface Tenant {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  favicon?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}
export type Char36 = string & { readonly __charLength: 36 };
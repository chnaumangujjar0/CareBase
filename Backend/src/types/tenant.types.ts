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
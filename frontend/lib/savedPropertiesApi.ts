/**
 * Tenant saved properties API
 */

import { apiDelete, apiGet, apiPost } from "./apiClient";

export interface SavedPropertiesListResponse {
  success: boolean;
  data: string[];
}

export interface SavedPropertyToggleResponse {
  success: boolean;
  data: { listingId: string; saved: boolean };
}

export async function fetchSavedListingIds(): Promise<string[]> {
  const response = await apiGet<SavedPropertiesListResponse>(
    "/api/tenant/saved-properties",
  );
  return response.data;
}

export async function saveListing(listingId: string): Promise<void> {
  await apiPost<SavedPropertyToggleResponse>(
    `/api/tenant/saved-properties/${encodeURIComponent(listingId)}`,
    {},
  );
}

export async function unsaveListing(listingId: string): Promise<void> {
  await apiDelete<SavedPropertyToggleResponse>(
    `/api/tenant/saved-properties/${encodeURIComponent(listingId)}`,
  );
}

export async function setListingSaved(
  listingId: string,
  saved: boolean,
): Promise<void> {
  if (saved) {
    await saveListing(listingId);
  } else {
    await unsaveListing(listingId);
  }
}

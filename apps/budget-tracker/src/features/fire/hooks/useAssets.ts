import useSWR from "swr";
import type { BtAsset } from "@/types";

export function useAssets() {
  const { data, error, isLoading, mutate } = useSWR<BtAsset[]>("/api/fire/assets");
  return { assets: data ?? [], isLoading, isError: error, mutate };
}

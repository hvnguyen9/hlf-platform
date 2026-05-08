import useSWR from "swr";
import type { Category } from "@/types";

export function useCategories() {
  const { data, error, isLoading, mutate } = useSWR<Category[]>("/api/categories");
  return { categories: data ?? [], isLoading, isError: error, mutate };
}

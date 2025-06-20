"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { FeeCategoryList } from "./FeeCategoryList";
import { FeeCategoryWorkspace } from "./FeeCategoryWorkspace";
import type { FeeCategory } from "@/app/services/admin-fee-config-service";

export function FeeStructureTab() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category");
  const activeTab = searchParams.get("tab") || "rules"; // Default to 'rules' tab

  // This function will be passed to the FeeCategoryList.
  // It updates the URL, which becomes the new source of truth.
  const handleSelectCategory = (category: FeeCategory) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    current.set("category", category.id.toString());
    // Keep the current tab or default to rules
    if (!current.has("tab")) {
      current.set("tab", "rules");
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.push(`${pathname}${query}`);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="min-h-[70vh] rounded-lg border">
      <ResizablePanel defaultSize={30} minSize={20}>
        <FeeCategoryList 
          activeCategoryId={categoryId ? Number(categoryId) : null}
          onSelectCategory={handleSelectCategory} 
        />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={70}>
        <FeeCategoryWorkspace 
          categoryId={categoryId ? Number(categoryId) : null}
          activeTab={activeTab}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
} 
"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/presentation/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/presentation/components/ui/command";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  type?: "SYSTEM" | "ACADEMIC";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
}

interface CategoryMultiSelectProps {
  categories: Category[];
  value: string[];
  onValueChange: (value: string[]) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
}

export function CategoryMultiSelect({
  categories,
  value,
  onValueChange,
  isLoading = false,
  placeholder = "Chọn danh mục...",
  className,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchValue.trim()) return categories;
    const lowerSearch = searchValue.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(lowerSearch) ||
        cat.description?.toLowerCase().includes(lowerSearch)
    );
  }, [categories, searchValue]);

  const selectedCategories = React.useMemo(() => {
    return categories.filter((cat) => value.includes(cat.id));
  }, [categories, value]);

  const handleSelect = (categoryId: string) => {
    const newValue = value.includes(categoryId)
      ? value.filter((id) => id !== categoryId)
      : [...value, categoryId];
    onValueChange(newValue);
  };

  const handleRemove = (categoryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(value.filter((id) => id !== categoryId));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between min-h-[42px] h-auto", className)}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selectedCategories.length === 0 ? (
              <span className="text-gray-500">{placeholder}</span>
            ) : (
              selectedCategories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 text-indigo-800 rounded text-sm"
                >
                  {cat.name}
                  <button
                    type="button"
                    onClick={(e) => handleRemove(cat.id, e)}
                    className="ml-1 hover:bg-indigo-200 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" style={{ width: "var(--radix-popover-trigger-width)" }}>
        <Command>
          <CommandInput
            placeholder="Tìm kiếm danh mục..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandEmpty>
            {isLoading ? "Đang tải..." : "Không tìm thấy danh mục."}
          </CommandEmpty>
          <CommandGroup>
            <div className="max-h-[300px] overflow-y-auto">
              {filteredCategories.map((category) => {
                const isSelected = value.includes(category.id);
                return (
                  <CommandItem
                    key={category.id}
                    value={category.id}
                    onSelect={() => handleSelect(category.id)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-gray-500">
                          {category.description}
                        </div>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </div>
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


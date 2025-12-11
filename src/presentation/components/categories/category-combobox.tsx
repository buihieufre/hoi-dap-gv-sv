"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Button } from "@/presentation/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/presentation/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/presentation/components/ui/popover";

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  slug: string;
  type?: "SYSTEM" | "ACADEMIC";
  approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
}

interface CategoryComboboxProps {
  categories: Category[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function CategoryCombobox({
  categories,
  value,
  onValueChange,
  placeholder = "Chọn danh mục...",
  disabled = false,
  isLoading = false,
  emptyMessage = "Không tìm thấy danh mục nào.",
  className,
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");

  const selectedCategory = categories.find((cat) => cat.id === value);

  // Filter categories based on search
  const filteredCategories = React.useMemo(() => {
    if (!searchValue) return categories;
    const search = searchValue.toLowerCase();
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(search) ||
        (cat.description && cat.description.toLowerCase().includes(search))
    );
  }, [categories, searchValue]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between",
            !selectedCategory && "text-slate-500",
            className
          )}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <span className="text-slate-500">Đang tải...</span>
          ) : selectedCategory ? (
            selectedCategory.name
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="p-0" 
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Tìm kiếm danh mục..." 
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>
              {searchValue ? emptyMessage : "Nhập để tìm kiếm..."}
            </CommandEmpty>
            <CommandGroup>
              {filteredCategories.map((category) => (
                <CommandItem
                  key={category.id}
                  value={category.id}
                  onSelect={() => {
                    onValueChange(category.id === value ? "" : category.id);
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value === category.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{category.name}</span>
                    {category.description && (
                      <span className="text-xs text-slate-500 truncate">
                        {category.description}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}


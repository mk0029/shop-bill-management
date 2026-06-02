import React from "react";
import { Search } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChange,
  placeholder = "Search chats...",
}) => {
  return (
    <div className="bg-gray-900 px-2 pb-2 pt-1 md:p-2">
      <div className="relative">
        <Search
          size={17}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-gray-800 bg-gray-800 py-2.5 pl-10 pr-3 text-[15px] text-gray-100 transition-all placeholder:text-gray-400 focus:border-gray-700 focus:outline-none"
        />
      </div>
    </div>
  );
};

export default SearchBar;

import { useState, useMemo } from 'react';

export default function CategoryCheckboxGroup({ categories, selectedCategoryIds, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;
    const lowerQuery = searchQuery.toLowerCase();
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(lowerQuery) ||
        (c.description && c.description.toLowerCase().includes(lowerQuery))
    );
  }, [categories, searchQuery]);

  const handleToggle = (categoryId) => {
    const isSelected = selectedCategoryIds.includes(categoryId);
    onChange(
      isSelected
        ? selectedCategoryIds.filter((id) => id !== categoryId)
        : [...selectedCategoryIds, categoryId]
    );
  };

  const handleSelectAll = () => {
    // Only select currently filtered categories
    const filteredIds = filteredCategories.map((c) => c.id);
    const newSelected = new Set([...selectedCategoryIds, ...filteredIds]);
    onChange(Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    // Only deselect currently filtered categories
    const filteredIds = new Set(filteredCategories.map((c) => c.id));
    const newSelected = selectedCategoryIds.filter(id => !filteredIds.has(id));
    onChange(newSelected);
  };

  if (categories.length === 0) {
    return <p className="text-sm text-surface-400">No categories available</p>;
  }

  return (
    <div>
      <div className="mb-3 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder="Search categories..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input pl-9 py-1.5 text-sm"
        />
      </div>
      
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={handleSelectAll}
          className="text-xs text-primary-600 hover:text-primary-700"
        >
          Select visible
        </button>
        <button
          type="button"
          onClick={handleDeselectAll}
          className="text-xs text-surface-400 hover:text-surface-600"
        >
          Deselect visible
        </button>
      </div>
      
      {filteredCategories.length === 0 ? (
        <p className="text-sm text-surface-500 py-2">No categories match your search.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {filteredCategories.map((cat) => (
            <label
              key={cat.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedCategoryIds.includes(cat.id)}
                onChange={() => handleToggle(cat.id)}
                className="mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                  {cat.name}
                </span>
                {cat.description && (
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {cat.description}
                  </p>
                )}
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

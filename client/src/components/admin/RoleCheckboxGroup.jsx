import { useState, useMemo } from 'react';

export default function RoleCheckboxGroup({ roles, selectedRoleIds, onChange }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredRoles = useMemo(() => {
    if (!searchQuery.trim()) return roles;
    const lowerQuery = searchQuery.toLowerCase();
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        (r.description && r.description.toLowerCase().includes(lowerQuery))
    );
  }, [roles, searchQuery]);

  const handleToggle = (roleId) => {
    const isSelected = selectedRoleIds.includes(roleId);
    onChange(
      isSelected
        ? selectedRoleIds.filter((id) => id !== roleId)
        : [...selectedRoleIds, roleId]
    );
  };

  const handleSelectAll = () => {
    // Only select currently filtered roles
    const filteredIds = filteredRoles.map((r) => r.id);
    const newSelected = new Set([...selectedRoleIds, ...filteredIds]);
    onChange(Array.from(newSelected));
  };

  const handleDeselectAll = () => {
    // Only deselect currently filtered roles
    const filteredIds = new Set(filteredRoles.map((r) => r.id));
    const newSelected = selectedRoleIds.filter(id => !filteredIds.has(id));
    onChange(newSelected);
  };

  if (roles.length === 0) {
    return <p className="text-sm text-surface-400">No roles available</p>;
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
          placeholder="Search roles..."
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

      {filteredRoles.length === 0 ? (
        <p className="text-sm text-surface-500 py-2">No roles match your search.</p>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
          {filteredRoles.map((role) => (
            <label
              key={role.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-800 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={selectedRoleIds.includes(role.id)}
                onChange={() => handleToggle(role.id)}
                className="mt-0.5 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-900 dark:text-surface-100">
                    {role.name}
                  </span>
                  {!!role.is_admin && (
                    <span className="badge bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                      Admin
                    </span>
                  )}
                  {!!role.is_default && (
                    <span className="badge bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      Default
                    </span>
                  )}
                </div>
                {role.description && (
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">
                    {role.description}
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

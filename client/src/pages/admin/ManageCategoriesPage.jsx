import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { categoriesApi } from '../../api/adminApi';
import toast from 'react-hot-toast';

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await categoriesApi.list();
      setCategories(data.data);
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete category "${name}"? It will be removed from all roles and reports.`)) return;
    try {
      await categoriesApi.remove(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin-slow h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">Manage Categories</h1>
        <Link to="/admin/categories/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New Category
        </Link>
      </div>

      {categories.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-500 mb-4">No categories found</p>
          <Link to="/admin/categories/new" className="btn-primary">Create your first category</Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Name</th>
                <th className="text-left py-3 px-4 font-medium text-surface-700 dark:text-surface-300 hidden md:table-cell">Description</th>
                <th className="text-center py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Reports</th>
                <th className="text-center py-3 px-4 font-medium text-surface-700 dark:text-surface-300 hidden sm:table-cell">Roles</th>
                <th className="text-right py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr key={cat.id} className="border-t border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  <td className="py-3 px-4 font-medium text-surface-900 dark:text-surface-100">{cat.name}</td>
                  <td className="py-3 px-4 text-surface-500 dark:text-surface-400 hidden md:table-cell max-w-xs truncate">{cat.description || '—'}</td>
                  <td className="py-3 px-4 text-center text-surface-600 dark:text-surface-400">{cat.report_count}</td>
                  <td className="py-3 px-4 text-center text-surface-600 dark:text-surface-400 hidden sm:table-cell">{cat.role_count}</td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/categories/${cat.id}/edit`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Delete"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

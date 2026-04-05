import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { usersApi } from '../../api/adminApi';
import { SkeletonTable } from '../../components/Skeleton';
import toast from 'react-hot-toast';

export default function ManageUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await usersApi.list({ search, page, pageSize: 8 });
      setUsers(data.data.users);
      setPagination(data.data.pagination);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(), 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleDelete = async (id, username) => {
    if (!confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await usersApi.remove(id);
      toast.success('User disabled');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete user');
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
        </div>
        <div className="h-10 w-64 bg-surface-200 dark:bg-surface-700 rounded animate-pulse" />
        <SkeletonTable />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">Manage Users</h1>
        <Link to="/admin/users/new" className="btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          New User
        </Link>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-md relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-surface-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            className="input pl-10"
            placeholder="Search by username or email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      {users.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-surface-500 mb-4">
            {search ? 'No users match your search' : 'No users found'}
          </p>
          {!search && (
            <Link to="/admin/users/new" className="btn-primary">Create your first user</Link>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-surface-800 rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 bg-white/50 dark:bg-surface-800/50 flex items-center justify-center z-10">
              <div className="animate-spin-slow h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
            </div>
          )}
          <table className="w-full text-sm">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Username</th>
                <th className="text-left py-3 px-4 font-medium text-surface-700 dark:text-surface-300 hidden md:table-cell">Email</th>
                <th className="text-left py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Roles</th>
                <th className="text-center py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Status</th>
                <th className="text-right py-3 px-4 font-medium text-surface-700 dark:text-surface-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t border-surface-100 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700/50">
                  <td className="py-3 px-4 font-medium text-surface-900 dark:text-surface-100">{user.username}</td>
                  <td className="py-3 px-4 text-surface-500 dark:text-surface-400 hidden md:table-cell">{user.email}</td>
                  <td className="py-3 px-4">
                    <div className="flex flex-wrap gap-1">
                      {user.roles.length > 0 ? (
                        user.roles.map((r) => (
                          <span key={r.id} className="badge bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                            {r.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-surface-400">None</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`badge ${user.is_active ? 'badge-success' : 'badge-error'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/users/${user.id}/edit`}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </Link>
                      <button
                        onClick={() => handleDelete(user.id, user.username)}
                        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-surface-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                        title="Disable / Delete"
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

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-surface-200 dark:border-surface-700 pt-4 mt-4">
          <p className="text-sm text-surface-500">
            Showing <span className="font-medium">{(pagination.page - 1) * pagination.pageSize + 1}</span> to <span className="font-medium">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</span> of <span className="font-medium">{pagination.total}</span> results
          </p>
          <div className="flex items-center gap-2">
            <button 
              className="btn-secondary px-3 py-1.5 text-sm" 
              disabled={page <= 1} 
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <span className="text-sm font-medium px-2 text-surface-700 dark:text-surface-300">
              Page {page} of {pagination.totalPages}
            </span>
            <button 
              className="btn-secondary px-3 py-1.5 text-sm" 
              disabled={page >= pagination.totalPages} 
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

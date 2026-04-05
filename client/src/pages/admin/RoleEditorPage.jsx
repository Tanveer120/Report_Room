import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { rolesApi, categoriesApi } from '../../api/adminApi';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import CategoryCheckboxGroup from '../../components/admin/CategoryCheckboxGroup';
import toast from 'react-hot-toast';

export default function RoleEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [categoryIds, setCategoryIds] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await categoriesApi.list();
      setAllCategories(data.data);
    } catch {
      toast.error('Failed to load categories');
    }
  }, []);

  const fetchRole = useCallback(async () => {
    try {
      const { data } = await rolesApi.getById(id);
      setName(data.data.name);
      setDescription(data.data.description || '');
      setIsDefault(data.data.is_default === 1);
      setIsAdmin(data.data.is_admin === 1);
      setIsActive(data.data.is_active === 1);

      const { data: catData } = await rolesApi.getCategories(id);
      setCategoryIds(catData.data.map((c) => c.id));
    } catch {
      toast.error('Failed to load role');
      navigate('/admin/roles');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchCategories();
    if (isEdit) fetchRole();
  }, [isEdit, fetchCategories, fetchRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Role name is required'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await rolesApi.update(id, {
          name,
          description,
          is_default: isDefault ? 1 : 0,
          is_admin: isAdmin ? 1 : 0,
          is_active: isActive ? 1 : 0,
        });
        await rolesApi.assignCategories(id, categoryIds);
        toast.success('Role updated');
      } else {
        await rolesApi.create({
          name,
          description,
          is_default: isDefault ? 1 : 0,
          is_admin: isAdmin ? 1 : 0,
        });
        toast.success('Role created');
      }
      navigate('/admin/roles');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save role');
    } finally {
      setSaving(false);
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
        <h1 className="text-2xl font-semibold text-surface-900 dark:text-surface-100">
          {isEdit ? 'Edit Role' : 'New Role'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <Input label="Role Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              Default role
            </label>
            <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
              <input
                type="checkbox"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
                className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
              />
              Admin role
            </label>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                />
                Active
              </label>
            )}
          </div>
        </div>

        {isEdit && (
          <div className="card">
            <h2 className="text-sm font-medium text-surface-700 dark:text-surface-300 mb-4">Accessible Categories</h2>
            <CategoryCheckboxGroup
              categories={allCategories}
              selectedCategoryIds={categoryIds}
              onChange={setCategoryIds}
            />
          </div>
        )}

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Role' : 'Create Role'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/roles')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

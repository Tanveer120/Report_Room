import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { categoriesApi } from '../../api/adminApi';
import Input from '../../components/Input';
import Textarea from '../../components/Textarea';
import toast from 'react-hot-toast';

export default function CategoryEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  const fetchCategory = useCallback(async () => {
    try {
      const { data } = await categoriesApi.getById(id);
      setName(data.data.name);
      setDescription(data.data.description || '');
    } catch {
      toast.error('Failed to load category');
      navigate('/admin/categories');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    if (isEdit) fetchCategory();
  }, [isEdit, fetchCategory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Category name is required'); return; }

    setSaving(true);
    try {
      if (isEdit) {
        await categoriesApi.update(id, { name, description });
        toast.success('Category updated');
      } else {
        await categoriesApi.create({ name, description });
        toast.success('Category created');
      }
      navigate('/admin/categories');
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to save category');
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
          {isEdit ? 'Edit Category' : 'New Category'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <Input label="Category Name *" value={name} onChange={(e) => setName(e.target.value)} required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </div>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update Category' : 'Create Category'}
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigate('/admin/categories')}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

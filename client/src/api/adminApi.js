import apiClient from './apiClient';

export const rolesApi = {
  list: () => apiClient.get('/admin/roles'),
  getById: (id) => apiClient.get(`/admin/roles/${id}`),
  create: (data) => apiClient.post('/admin/roles', data),
  update: (id, data) => apiClient.put(`/admin/roles/${id}`, data),
  remove: (id) => apiClient.delete(`/admin/roles/${id}`),
  assignCategories: (id, categoryIds) => apiClient.post(`/admin/roles/${id}/categories`, { categoryIds }),
  getCategories: (id) => apiClient.get(`/admin/roles/${id}/categories`),
  removeCategory: (roleId, catId) => apiClient.delete(`/admin/roles/${roleId}/categories/${catId}`),
};

export const categoriesApi = {
  list: () => apiClient.get('/admin/categories'),
  getById: (id) => apiClient.get(`/admin/categories/${id}`),
  create: (data) => apiClient.post('/admin/categories', data),
  update: (id, data) => apiClient.put(`/admin/categories/${id}`, data),
  remove: (id) => apiClient.delete(`/admin/categories/${id}`),
};

export const usersApi = {
  list: (params) => apiClient.get('/admin/users', { params }),
  getById: (id) => apiClient.get(`/admin/users/${id}`),
  create: (data) => apiClient.post('/admin/users', data),
  remove: (id) => apiClient.delete(`/admin/users/${id}`),
  assignRoles: (id, roleIds) => apiClient.post(`/admin/users/${id}/roles`, { roleIds }),
  getRoles: (id) => apiClient.get(`/admin/users/${id}/roles`),
  removeRole: (userId, roleId) => apiClient.delete(`/admin/users/${userId}/roles/${roleId}`),
};

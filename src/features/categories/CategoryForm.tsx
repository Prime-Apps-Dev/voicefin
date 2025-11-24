import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Category, TransactionType } from '../../core/types';
import { useLocalization } from '../../core/context/LocalizationContext';
import { ICON_NAMES, ICONS } from '../../shared/ui/icons/icons';
import { Trash2, Star } from 'lucide-react';
import { getLocalizedCategoryName } from '../../utils/constants';

const defaultState: Omit<Category, 'id' | 'isDefault' | 'isSystem'> = {
  name: '',
  icon: 'LayoutGrid',
  isFavorite: false,
  type: TransactionType.EXPENSE,
};

interface CategoryFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Omit<Category, 'id'> | Category) => void;
  onDelete: (category: Category) => void;
  category?: Category | null;
  isFavoriteDisabled: boolean;
  categories: Category[];
}

const IconDisplay: React.FC<{ name: string; className?: string; }> = ({ name, className }) => {
  const IconComponent = ICONS[name] || ICONS.LayoutGrid;
  return <IconComponent className={className} />;
};

export const CategoryForm: React.FC<CategoryFormProps> = ({ isOpen, onClose, onSave, onDelete, category, isFavoriteDisabled, categories }) => {
  const { t, language } = useLocalization();
  // Note: we initialize form state with the category object. 
  // For system categories, the name is the English key, but we will DISPLAY the translation.
  const [formData, setFormData] = useState<Omit<Category, 'id' | 'isDefault'> | Category>(defaultState);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (category) {
        setFormData(category);
      } else {
        setFormData(defaultState);
      }
      setError(null);
    }
  }, [category, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) {
      setError(null);
    }
  };

  const handleToggleFavorite = () => {
    setFormData(prev => ({ ...prev, isFavorite: !prev.isFavorite }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      return;
    }

    // Проверка на дубликаты (только если это не редактирование самой себя)
    const isDuplicate = categories.some(
      c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.id !== category?.id
    );

    if (isDuplicate) {
      setError(t('categoryNameExists'));
      return;
    }

    setError(null);
    onSave({ ...formData, name: trimmedName });
  };

  const handleDeleteClick = () => {
    if (category) {
      onDelete(category);
      onClose();
    }
  };

  const isSystemCategory = category?.isSystem || false;
  const isDefaultCategory = category?.isDefault || false;

  // Если категория системная, запрещаем редактирование имени
  const isNameDisabled = isDefaultCategory || isSystemCategory;

  // Для отображения используем локализованное имя, если это системная категория
  const displayName = isSystemCategory
    ? getLocalizedCategoryName(formData.name, language)
    : formData.name;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-[9999] px-4 py-[88px]"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-zinc-900 rounded-3xl shadow-2xl w-full max-h-[85vh] overflow-hidden flex flex-col border border-zinc-800/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-5 border-b border-zinc-800/60 z-10 flex-shrink-0">
              <h2 className="text-xl font-semibold text-white tracking-tight">{category ? t('editCategory') : t('createCategory')}</h2>
            </div>
            <form onSubmit={handleSubmit} className="overflow-y-auto">
              <div className="px-6 py-6 space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1.5">{t('categoryName')}</label>
                  <input
                    type="text"
                    name="name"
                    // Если редактирование запрещено, показываем переведенное имя. 
                    // Если разрешено (кастомная), показываем реальное значение из стейта.
                    value={isNameDisabled ? displayName : formData.name}
                    onChange={handleChange}
                    required
                    disabled={isNameDisabled}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all duration-200 disabled:bg-zinc-700/50 disabled:cursor-not-allowed"
                  />
                  {isSystemCategory && (
                    <p className="text-xs text-gray-500 mt-1 ml-1">
                      {t('systemCategoryCannotBeRenamed') || "System categories cannot be renamed"}
                    </p>
                  )}
                  {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
                </div>
                <div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">{t('categoryIcon')}</label>
                    {/* Изменено на flex flex-wrap justify-around для равномерного распределения пространства (justify-content) */}
                    <div className="h-48 overflow-y-auto flex flex-wrap justify-around gap-x-2 gap-y-2 p-3 bg-zinc-800/50 rounded-xl border border-zinc-700/50">
                      {ICON_NAMES.map(iconName => {
                        const isSelected = formData.icon === iconName;
                        return (
                          <button type="button" key={iconName} onClick={() => setFormData(prev => ({ ...prev, icon: iconName }))}
                            className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${isSelected ? 'bg-brand-blue text-white ring-2 ring-brand-blue' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                            <IconDisplay name={iconName} className="w-6 h-6" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-zinc-800 p-3 rounded-2xl border border-gray-700/50">
                  <span className="text-white font-medium">{t('favorite')}</span>
                  <button
                    type="button"
                    onClick={handleToggleFavorite}
                    disabled={isFavoriteDisabled && !formData.isFavorite}
                    className="p-2 rounded-full hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Toggle favorite"
                  >
                    <Star className={`w-6 h-6 transition-colors ${formData.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'}`} />
                  </button>
                </div>
              </div>

              <div className="sticky bottom-0 bg-zinc-900/95 backdrop-blur-xl px-6 py-4 border-t border-zinc-800/60 flex items-center justify-between space-x-3 flex-shrink-0">
                <div>
                  {category && !isDefaultCategory && !isSystemCategory && (
                    <button type="button" onClick={handleDeleteClick} className="p-2.5 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 active:scale-95 transition-all duration-200">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button type="button" onClick={onClose} className="px-5 py-2.5 text-zinc-300 hover:text-white text-sm font-medium rounded-xl hover:bg-zinc-800 active:scale-95 transition-all duration-200">{t('cancel')}</button>
                  <button type="submit" className="px-5 py-2.5 bg-brand-green text-white text-sm font-medium rounded-xl hover:bg-green-600 active:scale-95 transition-all duration-200">{t('save')}</button>
                </div>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
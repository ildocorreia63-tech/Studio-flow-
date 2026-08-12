import React, { useState, useEffect } from 'react';
import { Camera, PlusCircle, Trash2, Image as ImageIcon } from 'lucide-react';
import { DB } from '../../services/db';
import { Business } from '../../types';

interface GalleryItem {
  id: string;
  business_id: string;
  title: string;
  category: string;
  image_url: string;
  created_at: string;
}

interface GaleriaViewProps {
  business: Business;
}

export const GaleriaView: React.FC<GaleriaViewProps> = ({ business }) => {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Cabelo');
  const [imageUrl, setImageUrl] = useState('');

  const storageKey = `studioflow_gallery_${business.id}`;

  const loadGallery = () => {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      setItems(JSON.parse(raw));
    } else {
      // Seed initial photos
      const initial: GalleryItem[] = [
        {
          id: '1',
          business_id: business.id,
          title: 'Corte Degradê Navalhado',
          category: 'Barbearia',
          image_url: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=600&auto=format&fit=crop&q=60',
          created_at: new Date().toISOString(),
        },
        {
          id: '2',
          business_id: business.id,
          title: 'Design de Sobrancelhas + Henna',
          category: 'Sobrancelha',
          image_url: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&auto=format&fit=crop&q=60',
          created_at: new Date().toISOString(),
        },
      ];
      localStorage.setItem(storageKey, JSON.stringify(initial));
      setItems(initial);
    }
  };

  useEffect(() => {
    loadGallery();
  }, [business.id]);

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) return;

    const newItem: GalleryItem = {
      id: DB.generateId(),
      business_id: business.id,
      title,
      category,
      image_url: imageUrl,
      created_at: new Date().toISOString(),
    };

    const updated = [newItem, ...items];
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setItems(updated);
    setIsModalOpen(false);
    setTitle('');
    setImageUrl('');
  };

  const handleDelete = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setItems(updated);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-xs flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-gray-900">Galeria de Trabalhos</h2>
          <p className="text-xs text-gray-500">Portfólio de fotos dos serviços realizados no seu espaço</p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-purple-700 hover:bg-purple-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs shadow-md flex items-center space-x-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ ADICIONAR FOTO</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xs space-y-2 group">
            <div className="relative h-48 overflow-hidden bg-gray-100">
              <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-300" />
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-2 right-2 p-2 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow-md"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                {item.category}
              </span>
              <h4 className="font-bold text-gray-900 text-sm mt-1">{item.title}</h4>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-lg text-gray-900">Adicionar Foto ao Portfólio</h3>
            <form onSubmit={handleAddPhoto} className="space-y-3">
              <div>
                <label className="block text-xs font-bold uppercase mb-1">Título do Trabalho *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Luzes Morena Iluminada"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">Categoria *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs font-bold"
                >
                  <option value="Barbearia">Barbearia</option>
                  <option value="Cabelo">Cabelo</option>
                  <option value="Manicure">Manicure</option>
                  <option value="Sobrancelha">Sobrancelha</option>
                  <option value="Estética">Estética</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase mb-1">URL da Imagem *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full p-2.5 border rounded-xl text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Salvar Foto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

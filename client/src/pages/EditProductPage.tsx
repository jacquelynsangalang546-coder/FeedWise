import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { productApi } from '../api';
import { ProductForm } from '../components/products/ProductForm';
import { PageHeader } from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import type { ProductFormValues } from '../schemas/productSchema';
import type { Product } from '../types';
import { getErrorMessage } from '../utils/errors';
import NotFoundPage from './NotFoundPage';

// API product -> form values (ids for selects, yyyy-mm-dd for the date input)
function toFormValues(product: Product): ProductFormValues {
  return {
    name: product.name,
    sku: product.sku,
    category: product.category?._id ?? '',
    supplier: product.supplier?._id ?? '',
    animalType: product.animalType,
    unit: product.unit,
    costPrice: product.costPrice,
    sellingPrice: product.sellingPrice,
    stock: product.stock,
    reorderLevel: product.reorderLevel,
    expiryDate: product.expiryDate ? product.expiryDate.slice(0, 10) : '',
    description: product.description,
    isActive: product.isActive,
  };
}

export default function EditProductPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const product = useApi(() => productApi.get(id), [id]);
  useDocumentTitle(product.data ? `Edit ${product.data.name}` : 'Edit product');

  if (product.status === 404 || product.status === 400) {
    return <NotFoundPage embedded title="Product not found" message={product.error ?? undefined} />;
  }

  return (
    <>
      <PageHeader
        title="Edit product"
        description={product.data ? `${product.data.name} (${product.data.sku})` : undefined}
        back={
          <Link
            to={product.data ? `/products/${id}` : '/products'}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-700 hover:underline"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>
        }
      />
      {product.loading ? (
        <LoadingState rows={5} label="Loading product" />
      ) : product.error || !product.data ? (
        <ErrorState message={product.error ?? 'Product not found'} onRetry={product.refetch} />
      ) : (
        <ProductForm
          key={product.data._id}
          mode="edit"
          defaultValues={toFormValues(product.data)}
          onSubmit={async (values) => {
            const result = await productApi.update(id, values);
            toast.success(`${result.data.name} updated`);
            navigate(`/products/${id}`);
          }}
          onError={(error) => toast.error(getErrorMessage(error))}
        />
      )}
    </>
  );
}

import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { productApi } from '../api';
import { EMPTY_PRODUCT, ProductForm } from '../components/products/ProductForm';
import { PageHeader } from '../components/ui/PageHeader';
import { useToast } from '../context/ToastContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getErrorMessage } from '../utils/errors';

export default function AddProductPage() {
  useDocumentTitle('Add product');
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <>
      <PageHeader
        title="Add product"
        description="New products start with the opening stock you enter here."
        back={
          <Link to="/products" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-700 hover:underline">
            <ArrowLeft className="size-4" /> Products
          </Link>
        }
      />
      <ProductForm
        mode="create"
        defaultValues={EMPTY_PRODUCT}
        onSubmit={async (values) => {
          const result = await productApi.create(values);
          toast.success(`${result.data.name} added`);
          navigate(`/products/${result.data._id}`);
        }}
        onError={(error) => toast.error(getErrorMessage(error))}
      />
    </>
  );
}

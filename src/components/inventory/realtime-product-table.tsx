import { useEffect, useState } from "react";
import { useUpdatedDocuments } from "@/hooks/use-realtime-sync";
import { Card } from "@/components/ui/card";
import { Product } from "@/store/inventory-store";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface RealtimeProductTableProps {
  products: Product[];
  renderProduct: (product: Product, isHighlighted: boolean) => React.ReactNode;
}

export const RealtimeProductTable: React.FC<RealtimeProductTableProps> = ({
  products,
  renderProduct,
}) => {
  const [prevProducts, setPrevProducts] = useState<Product[]>([]);
  const { addUpdatedId, isRecentlyUpdated } = useUpdatedDocuments(2000); // 2 seconds highlight

  useEffect(() => {
    // Find new and updated products
    const newProducts = products.filter(
      (product) => !prevProducts.find((p) => p._id === product._id)
    );

    // Find updated products (excluding new ones)
    const updatedProducts = products.filter((product) => {
      const prevProduct = prevProducts.find((p) => p._id === product._id);
      return (
        prevProduct && JSON.stringify(prevProduct) !== JSON.stringify(product)
      );
    });

    // Show notifications for new products
    newProducts.forEach((product) => {
      addUpdatedId(product._id);
      toast.success(`New product added: ${product.name}`);
    });

    // Show notifications for updated products
    updatedProducts.forEach((product) => {
      addUpdatedId(product._id);
      const prevProduct = prevProducts.find((p) => p._id === product._id);
      if (
        prevProduct?.inventory.currentStock !== product.inventory.currentStock
      ) {
        toast.info(`Stock updated for: ${product.name}`);
      }
    });

    setPrevProducts(products);
  }, [products, addUpdatedId, prevProducts]);

  return (
    <AnimatePresence mode="sync">
      {products.map((product) => (
        <motion.div
          key={product._id}
          initial={false}
          animate={{
            backgroundColor: isRecentlyUpdated(product._id)
              ? "rgba(59, 130, 246, 0.1)"
              : "transparent",
          }}
          transition={{ duration: 0.5 }}>
          {renderProduct(product, isRecentlyUpdated(product._id))}
        </motion.div>
      ))}
    </AnimatePresence>
  );
};

import { useEffect, useState, cloneElement, ReactElement } from "react";
import { HTMLMotionProps } from "framer-motion";
import { useUpdatedDocuments } from "@/hooks/use-realtime-sync";
import { Card } from "@/components/ui/card";
import { Product } from "@/store/inventory-store";
import { motion, AnimatePresence, m } from "framer-motion";
import { toast } from "sonner";

interface RealtimeProductTableProps {
  products: Product[];
      renderProduct: (
    product: Product,
    isHighlighted: boolean,
    index: number,
    total: number
  ) => ReactElement<HTMLMotionProps<"tr">>;
}

export const RealtimeProductTable: React.FC<RealtimeProductTableProps> = ({
  products,
  renderProduct,
}) => {
    const [prevProducts, setPrevProducts] = useState<Product[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { addUpdatedId, isRecentlyUpdated } = useUpdatedDocuments(2000); // 2 seconds highlight

  useEffect(() => {
    if (isInitialLoad) {
      setPrevProducts(products);
      setIsInitialLoad(false);
      return;
    }

    const prevIdSet = new Set(prevProducts.map((p) => p._id));

    const newProducts = products.filter((p) => !prevIdSet.has(p._id));
    const updatedProducts = products.filter((p) => {
      if (!prevIdSet.has(p._id)) return false;
      const prevProduct = prevProducts.find((pp) => pp._id === p._id);
      return (
        prevProduct &&
        prevProduct.inventory?.currentStock !== p.inventory?.currentStock
      );
    });

    newProducts.forEach((p) => {
      addUpdatedId(p._id);
      toast.success(`New product added: ${p.name}`);
    });

    updatedProducts.forEach((p) => {
      addUpdatedId(p._id);
      toast.info(`Stock updated for: ${p.name}`);
    });

    setPrevProducts(products);
  }, [products, isInitialLoad, prevProducts, addUpdatedId]);

  return (
    <AnimatePresence>
            {products.map((product, index) => {
                const productElement = renderProduct(
          product,
          isRecentlyUpdated(product._id),
          index,
          products.length
        );
                        return cloneElement(productElement, {
          key: product._id,
          className: `${productElement.props.className || ""} transition-colors duration-500`,
          style: {
            ...productElement.props.style,
                        backgroundColor: isRecentlyUpdated(product._id)
              ? "hsl(var(--accent) / 0.1)"
              : "transparent",
          },
        });
      })}
    </AnimatePresence>
  );
};

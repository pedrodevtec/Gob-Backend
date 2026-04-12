ALTER TABLE "Equipment"
ADD COLUMN "levelRequirement" INTEGER;

UPDATE "Equipment" AS equipment
SET "levelRequirement" = product."levelRequirement"
FROM "ShopProduct" AS product
WHERE product."assetKind" = 'EQUIPMENT'
  AND equipment.name = product.name
  AND equipment.category = product.category
  AND equipment.type = product.type
  AND equipment.img = product.img
  AND equipment.effect IS NOT DISTINCT FROM product.effect
  AND equipment.value = product.price;

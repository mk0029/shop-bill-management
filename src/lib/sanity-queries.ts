import { sanityClient } from "@/lib/sanity";

// Fetch all specification options with category references
export const fetchSpecificationOptions = async (
  type: string | null = null,
  categorySlug: string | null = null
) => {
  let query = `
    *[_type == "specificationOption" && isActive == true
  `;

  if (type) {
    query += ` && type == "${type}"`;
  }

  if (categorySlug) {
    query += ` && "${categorySlug}" in categories[]`;
  }

  query += `] {
    _id,
    type,
    value,
    label,
    sortOrder,
    description,
    categories,
    isActive
  } | order(sortOrder asc)`;

  return await sanityClient.fetch(query);
};

// Fetch categories
export const fetchCategories = async (activeOnly = true) => {
  const query = `
    *[_type == "category" ${activeOnly ? "&& isActive == true" : ""}] {
      _id,
      name,
      slug,
      description,
      icon,
      parentCategory-> {
        _id,
        name,
        slug
      },
      isActive,
      sortOrder,
      createdAt,
      updatedAt
    } | order(sortOrder asc)
  `;

  return await sanityClient.fetch(query);
};

// Fetch category field mapping with resolved field definitions
export const fetchCategoryFieldMapping = async (categorySlug: string) => {
  const query = `
    *[_type == "categoryFieldMapping" && 
      categoryName == "${categorySlug}" && 
      isActive == true][0] {
      _id,
      categoryName,
      categoryType,
      requiredFields[]-> {
        _id,
        fieldKey,
        fieldLabel,
        fieldType,
        description,
        placeholder,
        validationRules,
        defaultValue,
        sortOrder,
        isActive,
        applicableCategories,
        conditionalLogic
      },
      optionalFields[]-> {
        _id,
        fieldKey,
        fieldLabel,
        fieldType,
        description,
        placeholder,
        validationRules,
        defaultValue,
        sortOrder,
        isActive,
        applicableCategories,
        conditionalLogic
      },
      description,
      isActive
    }
  `;

  return await sanityClient.fetch(query);
};

// Specific helper functions for common specification types
export const fetchAmperageOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("amperage", categorySlug);

export const fetchVoltageOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("voltage", categorySlug);

export const fetchWireGaugeOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("wireGauge", categorySlug);

export const fetchColorOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("color", categorySlug);

export const fetchLightTypeOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("lightType", categorySlug);

export const fetchMaterialOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("material", categorySlug);

export const fetchSizeOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("size", categorySlug);

export const fetchCoreOptions = (categorySlug: string | null = null) =>
  fetchSpecificationOptions("core", categorySlug);

// Fetch all specification options grouped by type
export const fetchAllSpecificationOptions = async () => {
  const query = `
    *[_type == "specificationOption" && isActive == true] {
      _id,
      type,
      value,
      label,
      sortOrder,
      description,
      categories,
      isActive
    } | order(type asc, sortOrder asc)
  `;

  const options = await sanityClient.fetch(query);

  // Group by type
  const grouped = options.reduce((acc: any, option: any) => {
    if (!acc[option.type]) {
      acc[option.type] = [];
    }
    acc[option.type].push(option);
    return acc;
  }, {});

  return grouped;
};

// Fetch all category field mappings with resolved field definitions
export const fetchAllCategoryFieldMappings = async () => {
  const query = `
    *[_type == "categoryFieldMapping" && isActive == true] {
      _id,
      category-> {
        _id,
        name,
        slug
      },
      categoryType,
      requiredFields[]-> {
        _id,
        fieldKey,
        fieldLabel,
        fieldType,
        description,
        placeholder,
        validationRules,
        defaultValue,
        sortOrder,
        isActive,
        applicableCategories,
        conditionalLogic
      },
      optionalFields[]-> {
        _id,
        fieldKey,
        fieldLabel,
        fieldType,
        description,
        placeholder,
        validationRules,
        defaultValue,
        sortOrder,
        isActive,
        applicableCategories,
        conditionalLogic
      },
      description,
      isActive
    } | order(category->name asc)
  `;

  return await sanityClient.fetch(query);
};

// Fetch all field definitions
export const fetchAllFieldDefinitions = async () => {
  const query = `
    *[_type == "fieldDefinition" && isActive == true] {
      _id,
      fieldKey,
      fieldLabel,
      fieldType,
      description,
      placeholder,
      validationRules,
      defaultValue,
      sortOrder,
      isActive,
      applicableCategories,
      conditionalLogic
    } | order(sortOrder asc, fieldLabel asc)
  `;

  return await sanityClient.fetch(query);
};

// Get category slug from ID
export const getCategorySlug = async (
  categoryId: string
): Promise<string | null> => {
  const query = `
    *[_type == "category" && _id == "${categoryId}"][0] {
      slug
    }
  `;

  const result = await sanityClient.fetch(query);
  return result?.slug?.current || null;
};

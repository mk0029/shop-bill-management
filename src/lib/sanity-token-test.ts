// Test API token permissions
export async function testApiToken() {
  const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

  if (!token) {
    return {
      success: false,
      error: "SANITY_API_TOKEN not found in environment variables",
    };
  }

  try {
    // Test with a simple query that should work with any token
    const response = await fetch(
      `https://idji8ni7.api.sanity.io/v2024-01-01/data/query/production?query=*%5B0...1%5D`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (response.status === 403) {
      return {
        success: false,
        error:
          'API token does not have read permissions. Please create a token with "Viewer" or "Editor" permissions.',
        status: response.status,
        tokenExists: true,
      };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: "API token is invalid or expired. Please generate a new token.",
        status: response.status,
        tokenExists: true,
      };
    }

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status,
        tokenExists: true,
      };
    }

    const data = await response.json();

    return {
      success: true,
      message: "API token is working correctly",
      sampleData: data,
      tokenExists: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      tokenExists: true,
    };
  }
}

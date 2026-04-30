// Input:  An object with potentially missing nested properties
// Output: The value or a safe fallback, never a TypeError

// Deep API response — any level can be missing
const response = {
  data: {
    user: {
      name: 'Alice',
      // address is missing entirely
    }
  }
};

// Without optional chaining — throws TypeError
// const city = response.data.user.address.city;

// With optional chaining — returns undefined safely
const city = response.data?.user?.address?.city;
console.log(city); // undefined (no error)

// With nullish coalescing — provide a default
const cityName = response.data?.user?.address?.city ?? 'Unknown';
console.log(cityName); // "Unknown"

// Safe method calls — function might not exist
const formatted = response.data?.user?.address?.format?.();
console.log(formatted); // undefined (no error)

// Safe array access
const users = response.data?.users;
const first = users?.[0]?.name ?? 'No users';
console.log(first); // "No users"

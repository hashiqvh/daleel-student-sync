// Test script to verify the login API response structure
const testData = {
  "userId": 278802,
  "token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "fullName": {
      "en": "RAYEES MUHAMMED CHACK AMMED CHACK",
      "ar": "رئيس محمد شاكو احمد شاكو"
    },
    "roles": [
      {
        "name": {
          "en": "Accountant",
          "ar": "المحاسب"
        },
        "roleClaims": null,
        "id": 3,
        "scope": "Accountant",
        "ownerId": null,
        "membersCount": null,
        "createdDate": "2022-10-12T10:09:20.6623391+04:00",
        "updatedDate": "2023-02-27T09:37:59.4995322+04:00"
      }
    ],
    "createdDate": "2024-09-17T01:34:47.49+04:00",
    "updatedDate": "2025-09-16T07:53:18.9296715+04:00",
    "id": 278802,
    "scope": "Employee",
    "ownerId": 1413,
    "phoneNumber": "0556923495",
    "email": "rayeesmuhammed.c@gmail.com",
    "isActive": true,
    "isADUser": false,
    "userPicture": null
  },
  "expires": "2025-09-17T11:54:46+04:00",
  "claims": []
};

console.log('Testing ownerId extraction:');
console.log('data.ownerId:', testData.ownerId); // undefined
console.log('data.user.ownerId:', testData.user.ownerId); // 1413
console.log('Fallback value:', testData.ownerId || testData.user?.ownerId || '1413'); // 1413
console.log('toString():', (testData.ownerId || testData.user?.ownerId || '1413').toString()); // "1413"

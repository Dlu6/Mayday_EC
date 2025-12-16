//api/apiService.js

// import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// export const apiService = createApi({
//     reducerPath: 'apiService',
//     baseQuery: fetchBaseQuery({
//         baseUrl: '/api',
//         prepareHeaders: (headers, { getState }) => {
//             const token = getState().auth.token; // Adjust based on where the token is stored in your state
//             console.log(token, "Token>>>>>>>>>>>>")
//             if (token) {
//                 headers.set('authorization', `Bearer ${token}`);
//             }
//             return headers;
//         },
//     }),
//     endpoints: (builder) => ({
//         // Add your endpoints here
//         updateExternIP: builder.mutation({
//             query: (networkConfig) => ({
//                 url: '/users/asterisk/update-externip', // Adjust URL as necessary
//                 method: 'POST',
//                 body: networkConfig,
//             }),
//         }),
//           // Endpoint for fetching the current externip
//           getExternIP: builder.query({
//             query: () => '/asterisk/get-externip',
//         }),
//         // You can add more endpoints here
//     }),
// });

// export const { useUpdateExternIPMutation, useGetExternIPQuery } = apiService;
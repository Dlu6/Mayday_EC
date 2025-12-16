// import odbc from 'odbc';

// // Renamed and adapted function for Asterisk DB operations
// async function createSipPeer(username, password, extensionNumber) {
//   try {
//     const connection = await odbc.connect('DSN=MySQLDB_MAYDAY'); // Ensure this DSN is configured to connect to the Asterisk database

//     // With pjsip
//      // Assuming you have a transport named 'transport-udp' configured in Asterisk
//      const createEndpointQuery = `
//      INSERT INTO ps_endpoints (id, transport, aors, auth, context, disallow, allow, direct_media)
//      VALUES (?, 'transport-udp', ?, ?, 'from-internal', 'all', 'ulaw,alaw', 'no')
//    `;

//    const createAuthQuery = `
//    INSERT INTO ps_auths (id, auth_type, password, username)
//    VALUES (?, 'userpass', ?, ?)
//  `;

//     const createAorQuery = `
//     INSERT INTO ps_aors (id, max_contacts)
//     VALUES (?, 1)
//     `;

//     await connection.query(createEndpointQuery, [extensionNumber, extensionNumber, extensionNumber]);
//     await connection.query(createAuthQuery, [extensionNumber, password, username]);
//     await connection.query(createAorQuery, [extensionNumber]);

//     console.log('PJSIP peer created successfully');

//     // Adapt this query to match the SQL operations needed for creating an extension and SIP account in Asterisk
//     // const createSipPeerQuery = `
//     // INSERT INTO sipfriends (name, secret, context, host, type)
//     // VALUES (?, ?, 'from-internal', 'dynamic', 'friend')
//     // `;

//     // Execute queries (assuming these are the correct queries for your Asterisk setup)
//     // await connection.query(createSipPeerQuery, [username, password]);
//     // await connection.query(createSipUserQuery, [username, username, email]);

//     // console.log('SIP peer created successfully');
//     await connection.close();
//   } catch (err) {
//     console.error('ODBC Connection Error:', err);
//     throw err; // Rethrow the error to handle it in the calling function
//   }
// }


// export { createSipPeer };
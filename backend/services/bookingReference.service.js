/**

 * Generates unique booking reference numbers.

 * Online: KSBT-YYYY-NNNNNN

 * Offline: OFF-NNNNNN (also stored as booking_reference)

 *

 * When called with a transaction client, uses SAVEPOINT so a missing

 * SQL function does not abort the outer booking transaction (25P02).

 */



const db = require('../db');



async function withSavepoint(client, name, fn) {

  if (!client) return fn(db);

  await client.query(`SAVEPOINT ${name}`);

  try {

    const result = await fn(client);

    await client.query(`RELEASE SAVEPOINT ${name}`);

    return result;

  } catch (error) {

    try {

      await client.query(`ROLLBACK TO SAVEPOINT ${name}`);

    } catch (_) {

      /* ignore */

    }

    throw error;

  }

}



async function generateBookingReference(client = null) {

  try {

    return await withSavepoint(client, 'sp_booking_ref', async (runner) => {

      const result = await runner.query('SELECT generate_booking_reference() AS ref');

      return result.rows[0]?.ref || null;

    });

  } catch (error) {

    const missing =

      error.code === '42883' ||

      error.message?.includes('generate_booking_reference') ||

      error.message?.includes('booking_reference_seq');

    if (!missing) throw error;



    const yr = new Date().getFullYear();

    return withSavepoint(client, 'sp_booking_ref_fb', async (runner) => {

      const fallback = await runner.query(

        `SELECT 'KSBT-${yr}-' || LPAD(

          (COALESCE(

            (SELECT MAX(CAST(SUBSTRING(booking_reference FROM 11) AS INTEGER))

             FROM bookings WHERE booking_reference LIKE 'KSBT-${yr}-%'),

            0

          ) + 1)::TEXT,

          6, '0'

        ) AS ref`

      );

      return fallback.rows[0]?.ref;

    });

  }

}



async function generateOfflineReferenceNumber(client = null) {

  try {

    return await withSavepoint(client, 'sp_offline_ref', async (runner) => {

      const result = await runner.query('SELECT generate_offline_reference_number() AS ref');

      return result.rows[0]?.ref || null;

    });

  } catch (error) {

    const missing =

      error.code === '42883' ||

      error.message?.includes('generate_offline_reference_number') ||

      error.message?.includes('offline_booking_reference_seq');

    if (!missing) throw error;



    return withSavepoint(client, 'sp_offline_ref_fb', async (runner) => {

      const fallback = await runner.query(

        `SELECT 'OFF-' || LPAD(

          (COALESCE(

            (SELECT MAX(CAST(SUBSTRING(offline_reference_number FROM 5) AS INTEGER))

             FROM bookings WHERE offline_reference_number IS NOT NULL),

            0

          ) + 1)::TEXT,

          6, '0'

        ) AS ref`

      );

      return fallback.rows[0]?.ref;

    });

  }

}



module.exports = {

  generateBookingReference,

  generateOfflineReferenceNumber

};



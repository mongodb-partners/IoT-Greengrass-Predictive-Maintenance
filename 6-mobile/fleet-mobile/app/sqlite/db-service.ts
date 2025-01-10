import {
  enablePromise,
  openDatabase,
  SQLiteDatabase,
} from 'react-native-sqlite-storage';
import {FormDataType} from '../types/types';

const tableName = 'jobs';

enablePromise(true);

export const getDBConnection = async (): Promise<SQLiteDatabase> => {
  const db = await openDatabase({name: 'iot.db', location: 'default'});
  if (!db) {
    throw new Error('Failed to open database connection.');
  }
  return db;
};

export const createTable = async (db: SQLiteDatabase) => {
  console.log('creating');
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (
      _id TEXT PRIMARY KEY,
      assignedToId TEXT,  
      assignedToName TEXT,  
      assignedToEmail TEXT,  
      notes TEXT,  
      vehicleId TEXT,  
      vehicleMake TEXT,  
      vehicleModel TEXT,  
      vehicleVin TEXT,  
      status TEXT,  
      type TEXT
    );`;

  return await db.executeSql(query);
};

export const getJobs = async (db: SQLiteDatabase, status?: string) => {
  try {
    const jobs = [];
    let results = [];
    if (status) {
      results = await db.executeSql(
        `SELECT * FROM ${tableName} where status = '${status}'`,
      );
    } else {
      results = await db.executeSql(`SELECT * FROM ${tableName}`);
    }

    results.forEach(result => {
      for (let index = 0; index < result.rows.length; index++) {
        const row = result.rows.item(index);
        const job = {
          _id: row._id,
          assignedTo: {
            _id: row.assignedToId,
            email: row.assignedToEmail,
            name: row.assignedToName,
          },
          vehicleId: {
            _id: row.vehicleId,
            make: row.vehicleMake,
            model: row.vehicleModel,
            vin: row.vehicleVin,
          },
          status: row.status,
          type: row.type,
          notes: row.notes,
        };
        jobs.push(job);
      }
    });

    return jobs;
  } catch (error) {
    console.error(error);
    throw Error('Failed');
  }
};

export const saveJob = async (db: SQLiteDatabase, data: any) => {
  const insertQuery =
    `INSERT OR REPLACE INTO ${tableName}(` +
    '_id, assignedToId, assignedToEmail, assignedToName, vehicleId, vehicleMake, vehicleModel, vehicleVin, ' +
    'status, notes, type) ' +
    'VALUES (' +
    `'${data._id}', ` +
    `'${data.assignedTo._id}', ` +
    `'${data.assignedTo.email}', ` +
    `'${data.assignedTo.name}', ` +
    `'${data.vehicleId._id}', ` +
    `'${data.vehicleId.make}', ` +
    `'${data.vehicleId.model}', ` +
    `'${data.vehicleId.vin}', ` +
    `'${data.status}', ` +
    `'${data.notes}', ` +
    `'${data.type}')`;

  return db.executeSql(insertQuery);
};

export const updateJob = async (db: SQLiteDatabase, data: any) => {
  const updateQuery = `UPDATE ${tableName} SET status = '${data.status}', notes = '${data.notes}' WHERE _id = '${data._id}'`;

  return db.executeSql(updateQuery);
};

export const deleteJob = async (db: SQLiteDatabase, id: string) => {
  const deleteQuery = `DELETE from ${tableName} WHERE _id = ?`;
  await db.executeSql(deleteQuery, [id]);
};

export const deleteTable = async (db: SQLiteDatabase) => {
  const query = `drop table ${tableName}`;

  await db.executeSql(query);
};

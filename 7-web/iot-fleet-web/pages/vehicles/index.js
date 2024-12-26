"use client";

import React from 'react';
import { Grid, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableRow, TableHead } from '@mui/material';
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client";
import { getVehicles, getJobs } from '../../graphql/queries';
import Loader from '../../components/Loader';
import Head from 'next/head';

const Vehicles = () => {

    const { loading: loadingVehicles, data: vehiclesData } = useQuery(gql(getVehicles));
    const { loading: loadingJobs, data: jobsData } = useQuery(gql(getJobs));
    
    if (loadingVehicles || loadingJobs) return <Loader />

    let vehicles = vehiclesData?.getVehicles ?? [];
    let jobs = jobsData?.getJobs ?? [];

    return (
        <>
            <Head>
                <title>Vehicles</title>
            </Head>
            <Grid container spacing={3}>
                <Grid item xs={12} sm={12} md={12}>
                        <Box m={2}>
                            <Grid container item xs={12}>
                                <h2>Vehicles</h2>
                            </Grid>
                            <TableContainer>
                                <Table aria-label="simple table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width="20%">Make</TableCell>
                                            <TableCell width="25%">Model</TableCell>
                                            <TableCell width="25%">VIN</TableCell>
                                            <TableCell width="45%">Status</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {vehicles.map((row, idx) => {
                                            let vJob = jobs?.find(
                                                (job) => String(job?.vehicleId._id) == String(row?._id) && ['TODO', 'INPROGRESS'].includes(job.status)
                                            );
                                            let status = vJob ? 'Requires Maintenance' : 'Healthy';
                                            return (
                                                <TableRow style={{ backgroundColor: status == 'Requires Maintenance' ? '#faf2f1' : '#ecfff2' }} key={idx}>
                                                    <TableCell component="th" scope="row">
                                                        {row.make}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        {row.model}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        {row.vin}
                                                    </TableCell>
                                                    <TableCell component="th" scope="row">
                                                        {status}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                </Grid>
            </Grid>
        </>
    );
};

export default Vehicles;

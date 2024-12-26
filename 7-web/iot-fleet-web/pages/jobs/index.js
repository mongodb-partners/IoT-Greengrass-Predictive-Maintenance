"use client";

import React from 'react';
import { Grid, Box, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableRow, TableHead } from '@mui/material';
import { gql } from "@apollo/client";
import { useQuery } from "@apollo/client";
import { getJobs } from '../../graphql/queries';
import Loader from '../../components/Loader';
import Head from 'next/head';

const Job = () => {

    const { loading, data } = useQuery(gql(getJobs));
    console.log('data: ', data);

    if (loading) return <Loader />
    let jobs = data?.getJobs ?? [];

    return (
        <>
            <Head>
                <title>Jobs</title>
            </Head>
            <Grid container spacing={0}>
                <Grid item xs={12} sm={12} md={12}>
                        <Box m={2}>
                            <Grid container item xs={12}>
                                <h2>Jobs</h2>
                            </Grid>
                            <TableContainer>
                                <Table aria-label="simple table">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell width="25%">Vehicle</TableCell>
                                            <TableCell width="25%">Notes</TableCell>
                                            <TableCell width="15%">Type</TableCell>
                                            <TableCell width="15%">Status</TableCell>
                                            <TableCell width="15%">Assigned To</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {jobs.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell component="th" scope="row">
                                                    {row.vehicleId?.make} {row.vehicleId?.model} ({row.vehicleId?.vin})
                                                </TableCell>
                                                <TableCell>{row.notes}</TableCell>
                                                <TableCell>{row.type}</TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={row.status}
                                                        color={
                                                            row?.status == 'COMPLETED'
                                                                ? 'success'
                                                                : row?.status == 'INPROGRESS'
                                                                    ? 'warning'
                                                                    : row?.status == 'CANCELLED'
                                                                        ? 'error'
                                                                        : 'default'
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell>{String(row.assignedTo?.name)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Box>
                </Grid>
            </Grid>
        </>
    );
};

export default Job;

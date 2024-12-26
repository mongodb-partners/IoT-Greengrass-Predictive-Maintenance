"use client"

import React, { useState } from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Button, FormHelperText, TextField, FormControl, InputLabel, OutlinedInput, InputAdornment, IconButton } from '@mui/material';
import { useRouter } from 'next/router'

import * as Yup from 'yup';
import { Formik, Form } from 'formik';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { gql } from "@apollo/client";
import { useMutation } from "@apollo/client";
import { login } from '../../graphql/mutations';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';

const AuthLogin = () => {
  const theme = useTheme();
  const [showPassword, setShowPassword] = React.useState(false);
  const router = useRouter()

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleMouseDownPassword = (event) => {
    event.preventDefault();
  };

  const [loginUser] = useMutation(gql(login));
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  return (
    <>
      <Formik
        initialValues={{
          email: 'achu@live.in',
          password: '123',
          submit: null
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string().email('Must be a valid email').max(255).required('Email is required'),
          password: Yup.string().max(255).required('Password is required')
        })}
        onSubmit={async (values) => {
          setLoading(true);
          let response = await loginUser({ variables: { email: values?.email, password: values?.password } });
          setLoading(false);
          if (response?.data?.login?._id) {
            router.push('/jobs')
          } else {
            setError(`Invalid Credentials`);
          }
        }}
      >
        {({ errors, handleBlur, handleChange, touched, values }) => (
          <Form noValidate>
            <TextField
              error={Boolean(touched.email && errors.email)}
              fullWidth
              helperText={touched.email && errors.email}
              label="Email Address / Username"
              margin="normal"
              name="email"
              onBlur={handleBlur}
              onChange={handleChange}
              type="email"
              value={values.email}
              variant="outlined"
            />

            <FormControl fullWidth error={Boolean(touched.password && errors.password)} sx={{ mt: theme.spacing(3), mb: theme.spacing(1) }}>
              <InputLabel htmlFor="outlined-adornment-password">Password</InputLabel>
              <OutlinedInput
                id="outlined-adornment-password"
                type={showPassword ? 'text' : 'password'}
                value={values.password}
                name="password"
                onBlur={handleBlur}
                onChange={handleChange}
                label="Password"
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      size="large"
                    >
                      {showPassword ? <Visibility /> : <VisibilityOff />}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {touched.password && errors.password && (
                <FormHelperText error id="standard-weight-helper-text">
                  {' '}
                  {errors.password}{' '}
                </FormHelperText>
              )}
            </FormControl>

            {errors.submit && (
              <Box mt={3}>
                <FormHelperText error>{errors.submit}</FormHelperText>
              </Box>
            )}

            <Box mt={2}>
              <Button style={{ background: '#00684A' }} fullWidth size="large" type="submit" variant="contained">
                {loading ? <CircularProgress size={30} /> : 'Log In'}
              </Button>
            </Box>
          </Form>
        )}
      </Formik>
      <Snackbar
        open={error}
        onClose={() => {
          setError(null);
        }}
        autoHideDuration={2000}
        message="Invalid Credentials"
      />
    </>
  );
};

export default AuthLogin;

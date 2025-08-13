import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { format, subDays } from 'date-fns';
import axios from 'axios';

const EmployeeDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date()
  });

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  useEffect(() => {
    if (employee) {
      fetchAttendanceData();
    }
  }, [employee, dateRange]);

  const fetchEmployeeData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/employees/${id}`);
      setEmployee(response.data);
    } catch (err) {
      console.error('Error fetching employee:', err);
      setError('Failed to load employee data');
      setLoading(false);
    }
  };

  const fetchAttendanceData = async () => {
    try {
      const { startDate, endDate } = dateRange;
      const response = await axios.get(`/api/employees/${id}/attendance`, {
        params: {
          startDate: format(startDate, 'yyyy-MM-dd'),
          endDate: format(endDate, 'yyyy-MM-dd')
        }
      });
      setAttendance(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      setError('Failed to load attendance data');
      setLoading(false);
    }
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleDateChange = (field, value) => {
    setDateRange({
      ...dateRange,
      [field]: value
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'present':
        return 'success';
      case 'absent':
        return 'error';
      case 'late':
        return 'warning';
      case 'half-day':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading && !employee) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">{error}</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employees')}
          sx={{ mt: 2 }}
        >
          Back to Employees
        </Button>
      </Box>
    );
  }

  if (!employee) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="warning">Employee not found</Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employees')}
          sx={{ mt: 2 }}
        >
          Back to Employees
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/employees')}
        sx={{ mb: 2 }}
      >
        Back to Employees
      </Button>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h5">{employee.name}</Typography>
              <Box>
                <Chip
                  label={employee.isActive ? 'Active' : 'Inactive'}
                  color={employee.isActive ? 'success' : 'default'}
                  sx={{ mr: 1 }}
                />
                {employee.isHR && <Chip label="HR" color="primary" />}
              </Box>
            </Box>
            <Divider sx={{ my: 2 }} />
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.email}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="text.secondary">
              Telegram ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.telegramId}
            </Typography>
          </Grid>

          {employee.telegramUsername && (
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" color="text.secondary">
                Telegram Username
              </Typography>
              <Typography variant="body1" gutterBottom>
                @{employee.telegramUsername}
              </Typography>
            </Grid>
          )}

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="text.secondary">
              Department
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.department || '-'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="text.secondary">
              Position
            </Typography>
            <Typography variant="body1" gutterBottom>
              {employee.position || '-'}
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" color="text.secondary">
              Joined On
            </Typography>
            <Typography variant="body1" gutterBottom>
              {formatDate(employee.createdAt)}
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <Typography variant="h5" gutterBottom>
        Attendance History
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={dateRange.startDate}
                onChange={(date) => handleDateChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={5}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={dateRange.endDate}
                onChange={(date) => handleDateChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="attendance history table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record) => (
                  <TableRow hover key={record._id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>
                      {formatTime(record.checkIn?.time)}
                      {record.checkIn?.modifiedBy && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          (Modified)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {formatTime(record.checkOut?.time)}
                      {record.checkOut?.modifiedBy && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          (Modified)
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{record.totalHours || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                        color={getStatusChipColor(record.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {record.notes ? (
                        <Typography
                          variant="body2"
                          sx={{
                            maxWidth: 150,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {record.notes}
                        </Typography>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              {attendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No attendance records found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={attendance.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default EmployeeDetail;
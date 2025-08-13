import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { Edit as EditIcon } from '@mui/icons-material';
import axios from 'axios';
import { format } from 'date-fns';

const AttendanceReport = () => {
  const [attendance, setAttendance] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    startDate: new Date(),
    endDate: new Date(),
    employeeId: ''
  });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [formData, setFormData] = useState({
    checkIn: null,
    checkOut: null,
    status: '',
    notes: ''
  });

  useEffect(() => {
    fetchEmployees();
    // Initial fetch with today's date
    fetchAttendance();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
    }
  };

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const { startDate, endDate, employeeId } = filters;
      
      const params = {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd')
      };
      
      if (employeeId) {
        params.employeeId = employeeId;
      }
      
      const response = await axios.get('/api/attendance', { params });
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

  const handleFilterChange = (field, value) => {
    setFilters({
      ...filters,
      [field]: value
    });
  };

  const handleApplyFilters = () => {
    setPage(0);
    fetchAttendance();
  };

  const handleOpenDialog = (attendanceRecord) => {
    setSelectedAttendance(attendanceRecord);
    setFormData({
      checkIn: attendanceRecord.checkIn.time ? new Date(attendanceRecord.checkIn.time) : null,
      checkOut: attendanceRecord.checkOut.time ? new Date(attendanceRecord.checkOut.time) : null,
      status: attendanceRecord.status,
      notes: attendanceRecord.notes || ''
    });
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleChange = (field, value) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  const handleSubmit = async () => {
    try {
      await axios.put(`/api/attendance/${selectedAttendance._id}`, formData);
      handleCloseDialog();
      fetchAttendance();
    } catch (err) {
      console.error('Error updating attendance:', err);
      setError(err.response?.data?.message || 'Failed to update attendance');
    }
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

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  if (loading && attendance.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Attendance Report
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="End Date"
                value={filters.endDate}
                onChange={(date) => handleFilterChange('endDate', date)}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth>
              <InputLabel>Employee</InputLabel>
              <Select
                value={filters.employeeId}
                label="Employee"
                onChange={(e) => handleFilterChange('employeeId', e.target.value)}
              >
                <MenuItem value="">All Employees</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="contained"
              onClick={handleApplyFilters}
              fullWidth
              sx={{ height: '56px' }}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="attendance table">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Employee</TableCell>
                <TableCell>Check In</TableCell>
                <TableCell>Check Out</TableCell>
                <TableCell>Total Hours</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Notes</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {attendance
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((record) => (
                  <TableRow hover key={record._id}>
                    <TableCell>{formatDate(record.date)}</TableCell>
                    <TableCell>{record.employee?.name || 'Unknown'}</TableCell>
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
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenDialog(record)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {attendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
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

      {/* Edit Attendance Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Attendance Record</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Check In Date"
                    value={formData.checkIn}
                    onChange={(date) => handleChange('checkIn', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Check Out Date"
                    value={formData.checkOut}
                    onChange={(date) => handleChange('checkOut', date)}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={(e) => handleChange('status', e.target.value)}
                  >
                    <MenuItem value="present">Present</MenuItem>
                    <MenuItem value="absent">Absent</MenuItem>
                    <MenuItem value="late">Late</MenuItem>
                    <MenuItem value="half-day">Half Day</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  sx={{ mt: 2 }}
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AttendanceReport;
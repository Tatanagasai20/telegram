import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
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
  DialogContentText,
  DialogTitle,
  TextField,
  FormControlLabel,
  Switch,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import axios from 'axios';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    telegramId: '',
    telegramUsername: '',
    department: '',
    position: '',
    isHR: false
  });
  const navigate = useNavigate();

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/employees');
      setEmployees(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching employees:', err);
      setError('Failed to load employees');
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

  const handleOpenDialog = (employee = null) => {
    if (employee) {
      setSelectedEmployee(employee);
      setFormData({
        name: employee.name,
        email: employee.email,
        telegramId: employee.telegramId,
        telegramUsername: employee.telegramUsername || '',
        department: employee.department || '',
        position: employee.position || '',
        isHR: employee.isHR || false
      });
    } else {
      setSelectedEmployee(null);
      setFormData({
        name: '',
        email: '',
        telegramId: '',
        telegramUsername: '',
        department: '',
        position: '',
        isHR: false
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDeleteDialog = (employee) => {
    setSelectedEmployee(employee);
    setOpenDeleteDialog(true);
  };

  const handleCloseDeleteDialog = () => {
    setOpenDeleteDialog(false);
  };

  const handleChange = (e) => {
    const { name, value, checked } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'isHR' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (selectedEmployee) {
        // Update existing employee
        await axios.put(`/api/employees/${selectedEmployee._id}`, formData);
      } else {
        // Create new employee
        await axios.post('/api/employees', formData);
      }
      handleCloseDialog();
      fetchEmployees();
    } catch (err) {
      console.error('Error saving employee:', err);
      setError(err.response?.data?.message || 'Failed to save employee');
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/employees/${selectedEmployee._id}`);
      handleCloseDeleteDialog();
      fetchEmployees();
    } catch (err) {
      console.error('Error deleting employee:', err);
      setError(err.response?.data?.message || 'Failed to delete employee');
    }
  };

  const handleViewEmployee = (id) => {
    navigate(`/employees/${id}`);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Employees</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
        >
          Add Employee
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader aria-label="employees table">
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Telegram ID</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Position</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((employee) => (
                  <TableRow hover key={employee._id}>
                    <TableCell>{employee.name}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell>{employee.telegramId}</TableCell>
                    <TableCell>{employee.department || '-'}</TableCell>
                    <TableCell>{employee.position || '-'}</TableCell>
                    <TableCell>
                      <Chip
                        label={employee.isActive ? 'Active' : 'Inactive'}
                        color={employee.isActive ? 'success' : 'default'}
                        size="small"
                      />
                      {employee.isHR && (
                        <Chip
                          label="HR"
                          color="primary"
                          size="small"
                          sx={{ ml: 1 }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="primary"
                        onClick={() => handleViewEmployee(employee._id)}
                        size="small"
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        color="secondary"
                        onClick={() => handleOpenDialog(employee)}
                        size="small"
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleOpenDeleteDialog(employee)}
                        size="small"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              {employees.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No employees found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={employees.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      {/* Add/Edit Employee Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedEmployee ? 'Edit Employee' : 'Add New Employee'}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Name"
              name="name"
              value={formData.name}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Telegram ID"
              name="telegramId"
              value={formData.telegramId}
              onChange={handleChange}
              helperText="The unique identifier for the employee's Telegram account"
            />
            <TextField
              margin="normal"
              fullWidth
              label="Telegram Username"
              name="telegramUsername"
              value={formData.telegramUsername}
              onChange={handleChange}
              helperText="Optional: The employee's Telegram username (without @)"
            />
            <TextField
              margin="normal"
              fullWidth
              label="Department"
              name="department"
              value={formData.department}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              fullWidth
              label="Position"
              name="position"
              value={formData.position}
              onChange={handleChange}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isHR}
                  onChange={handleChange}
                  name="isHR"
                  color="primary"
                />
              }
              label="HR Access"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedEmployee ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Deactivation</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to deactivate {selectedEmployee?.name}? This will prevent them from using the attendance system.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Deactivate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Employees;
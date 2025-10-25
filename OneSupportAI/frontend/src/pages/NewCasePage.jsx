import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import '../styles/pages/NewCasePage.css';
import { createCase } from '../services/caseService';
import { useUser } from '../hooks/useUser';

const NewCasePage = () => {
  const navigate = useNavigate();
  const {token} = useUser();
  const [form, setForm] = useState({
    status: 'pending',
    caseId: '',
    todo: '',
    name: '',
    contactCode: '+64',
    contactNumber: '',
    email: '',
    product: '',
    summary: '',
    actions: '',
    activeStartTime: Date.now(),
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => navigate('/cases');
  const handleSave = async () => {
    // Validate required fields
    const requiredFields = [
      { field: 'name', label: 'Customer Name' },
      { field: 'email', label: 'Email' },
      { field: 'contactNumber', label: 'Contact Number' },
      { field: 'product', label: 'Product Concerned' },
      { field: 'summary', label: 'Summary of Issue' }
    ];

    for (const { field, label } of requiredFields) {
      if (!form[field] || form[field].trim() === '') {
        toast.error(`${label} is required.`);
        return;
      }
    }

    try {
      const toastId = toast.loading('Saving case...', {isLoading: true, autoClose: 3000});
      
      console.log(form);
      const res = await createCase(token, form);
      console.log(res);

      toast.update(toastId, {
        render: 'Case saved successfully',
        type: 'success',
        isLoading: false,
        autoClose: 3000
      });

      navigate('/cases');
    } catch (error) {
      console.error('Failed to save case:', error);
      
      toast.error('Failed to save case. Please try again.');
    }
  };

  return (
    <div 
      className="homepage-layout"
    >
      <div className="new-case-page">
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: '0.5rem' }}>
          <button className="btn-secondary" style={{ marginRight: 'auto' }} onClick={handleCancel}>Back</button>
        </div>
  <form className="case-form" style={{ marginTop: '0.5rem' }} onSubmit={e => { e.preventDefault(); handleSave(); }}>
          <div className="form-section">
            <h3>Case Details:</h3>
            <div className="form-row">
              <label>Case Status:</label>
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="pending">Pending</option>
                <option value="closed">Closed</option>
              </select>
              {/* <label>Case ID:</label>
              <input name="caseId" type="text" value={form.caseId} onChange={handleChange} placeholder="Value" /> */}
            </div>
            <div className="form-row">
              <label>Priority:</label>
              <select name="priority" value={form.priority || ''} onChange={handleChange}>
                <option value="" disabled hidden={!!form.priority}>Select priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              <div className="date-row">
                <label>Date & Time:</label>
                <span className="date-value">{
                  new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                }</span>
              </div>
            </div>
          </div>
          <div className="form-section">
            <h3>Customer Details:</h3>
            <div className="form-row">
              <label>Name: <span className="required">*</span></label>
              <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Enter customer name" />
            </div>
            <div className="form-row">
              <label>Contact number: <span className="required">*</span></label>
              <select name="contactCode" value={form.contactCode} onChange={handleChange}>
                <option>+64</option>
                <option>+61</option>
                <option>+1</option>
              </select>
              <input name="contactNumber" type="text" value={form.contactNumber} onChange={handleChange} placeholder="Phone number" />
            </div>
            <div className="form-row">
              <label>E-mail: <span className="required">*</span></label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter email address" />
            </div>
          </div>
          <div className="form-section">
            <h3>Issue Details:</h3>
            <div className="form-row">
              <label>Product Concerned: <span className="required">*</span></label>
              <input name="product" type="text" value={form.product} onChange={handleChange} placeholder="Enter product name" />
            </div>
            <div className="form-row textarea-row">
              <label>Summary of Issue: <span className="required">*</span></label>
              <textarea name="summary" value={form.summary} onChange={handleChange} placeholder="Describe the issue in detail..." />
            </div>
            <div className="form-row textarea-row">
              <label>Actions Taken During the Call:</label>
              <textarea name="actions" value={form.actions} onChange={handleChange} placeholder="Description..." />
            </div>
            <div className="form-row textarea-row">
              <label>To do:</label>
              <textarea name="todo" value={form.todo || ''} onChange={handleChange} placeholder="List next steps, follow-ups, etc..." />
            </div>
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={handleCancel}>Cancel</button>
            <button type="submit" className="btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCasePage;
# Test Report Generation Guide

## Quick Reference

### Generate Test Report
```bash
npm run test:report <feature-name>
```

Example:
```bash
npm run test:report vehicle-management
```

Output: `be/docs/TEST_REPORT_VEHICLE-MANAGEMENT.md`

---

## Test Writing Guidelines

### 1. Use Tag-Based Classification

Always prefix test descriptions with category tags:

```javascript
// ✅ GOOD - With tags
test('[Integration] Create vehicle with valid data', async () => {...})
test('[Negative] Reject duplicate registrationNumber', async () => {...})
test('[Security] Require authentication for vehicle access', async () => {...})
test('[Performance] Handle pagination with large limit', async () => {...})

// ❌ BAD - Without tags
test('should create vehicle with valid data', async () => {...})
test('should reject duplicate registrationNumber', async () => {...})
```

### 2. Test Categories & Distribution

Aim for 15-20 tests per feature with this distribution:

| Category | Percentage | Example Tests |
|----------|-----------|---------------|
| **Integration** | 40-50% | CRUD operations, search, filter, list with pagination |
| **Negative** | 25-35% | Validation errors, missing fields, invalid data, business rule violations |
| **Security** | 15-25% | Authentication required, authorization checks, permission validation |
| **Performance** | 5-10% | Large pagination limits, bulk operations, query optimization |

### 3. Test Structure Template

```javascript
describe('Vehicle API Tests', () => {
  let authToken;
  let testVehicleId;

  beforeAll(async () => {
    await connectDB();
    // Login to get auth token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@example.com', password: 'Admin@123' });
    authToken = loginResponse.body.data.token;
  });

  afterAll(async () => {
    // Cleanup test data
    await mongoose.connection.close();
  });

  describe('[Integration] CRUD Operations', () => {
    test('[Integration] Create resource with valid data', async () => {
      // Test implementation
    });
    
    test('[Integration] Get all resources with pagination', async () => {
      // Test implementation
    });
  });

  describe('[Negative] Validation Tests', () => {
    test('[Negative] Reject duplicate unique field', async () => {
      // Test implementation
    });
    
    test('[Negative] Reject missing required fields', async () => {
      // Test implementation
    });
  });

  describe('[Security] Authentication and Authorization', () => {
    test('[Security] Require authentication for resource access', async () => {
      // Test implementation
    });
  });
});
```

---

## Report Structure

Generated reports include:

### 1. Test Cases Table
| Test ID | Description | Input | Expected Output |
|---------|-------------|-------|-----------------|
| TC-001 | [Integration] Create vehicle... | Valid vehicle object | 201 Created |
| TC-002 | [Negative] Reject duplicate... | Duplicate registrationNumber | 400 Bad Request |

### 2. Test Classification
- Integration Tests (X tests)
- Negative Tests (Y tests)
- Security Tests (Z tests)
- Performance Tests (W tests)

### 3. Functional Testing Summary
- Total test cases
- Distribution by category
- Expected pass rate: 100%
- Test coverage areas

### 4. Non-Functional Test Cases
- Performance considerations
- Security measures
- Edge case handling

### 5. Academic Report Content
- **5.1 Testing Methodology**: Formal description of testing approach
- **5.2 Functional Testing Results**: Detailed analysis of test execution

---

## Integration with OpenSpec Workflow

### When to Generate Reports

**ALWAYS** generate test report as the final task after:
1. ✅ Implementing all tests
2. ✅ Verifying all tests pass
3. ✅ Ensuring 15-20 tests with proper tags

### Example Task in tasks.md

```markdown
- [ ] Task 7: Testing
  - [ ] 7.1: Write integration tests for CRUD operations (5 tests)
  - [ ] 7.2: Write negative tests for validation (4 tests)
  - [ ] 7.3: Write security tests for authentication (3 tests)
  - [ ] 7.4: Write performance tests for pagination (1 test)
  - [ ] 7.5: Run all tests and verify 100% pass rate
  - [ ] 7.6: Generate test report
    - Run: `npm run test:report vehicle-management`
    - Verify: `be/docs/TEST_REPORT_VEHICLE-MANAGEMENT.md` created
    - Check: Report contains 15 tests with proper classification
```

---

## Prerequisites

Before running tests:

1. **Database Setup**
   ```bash
   # Ensure MongoDB is running and .env is configured
   ```

2. **Seed Admin User**
   ```bash
   npm run seed
   ```
   
   This creates:
   - Email: `admin@example.com`
   - Password: `Admin@123`
   - Role: Admin with all permissions

3. **Environment Variables**
   ```env
   MONGODB_URI=mongodb://...
   JWT_SECRET=your_secret_key
   JWT_EXPIRE=30d
   ```

---

## Troubleshooting

### Tests Fail with "Failed to login"
**Solution**: Run `npm run seed` to create admin user

### Report Shows Wrong Classification
**Solution**: Ensure test descriptions have proper tags: `[Integration]`, `[Negative]`, `[Security]`, `[Performance]`

### Report Not Generated
**Solution**: Check that test files exist in `be/src/tests/` and end with `.test.js`

---

## Using Reports in Academic Documentation

### Copy to Your Report

1. **Testing Methodology Section**
   - Copy Section 5.1 from generated report
   - Paste into your project report's "Testing Methodology" section

2. **Testing Results Section**
   - Copy Section 5.2 from generated report
   - Paste into your project report's "Testing Results" section

3. **Test Cases Appendix**
   - Copy Section 1 (Test Cases Table)
   - Add to appendix or detailed testing section

4. **Test Classification**
   - Copy Section 2 (Test Classification)
   - Use in testing strategy section

### Example Academic Report Structure

```markdown
# Chapter 5: Testing

## 5.1 Testing Methodology
[Paste content from generated report Section 5.1]

## 5.2 Testing Results
[Paste content from generated report Section 5.2]

## 5.3 Test Cases
[Paste content from generated report Section 1]

## 5.4 Test Classification
[Paste content from generated report Section 2]
```

---

## Advanced: Customizing Reports

### Modify Report Template

Edit `.kiro/steering/test-report-generation.md` to customize:
- Report structure
- Section content
- Formatting style

### Modify Report Generator

Edit `be/scripts/generate-test-report.js` to customize:
- Test parsing logic
- Classification rules
- Output format

---

## Summary Checklist

- [ ] Write 15-20 tests with proper tags
- [ ] Ensure balanced distribution across categories
- [ ] Run `npm test` to verify all tests pass
- [ ] Run `npm run test:report <feature-name>`
- [ ] Verify report generated in `be/docs/`
- [ ] Review report for accuracy
- [ ] Copy relevant sections to academic report

---

**Last Updated**: 2026-04-13

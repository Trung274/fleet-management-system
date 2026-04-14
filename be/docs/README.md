# Test Report Documentation

This directory contains automatically generated test reports for academic documentation purposes.

## Prerequisites

Before running tests, ensure the following:

### 1. Database Setup
- MongoDB connection configured in `.env` file
- Database seeded with initial data

### 2. Admin User Setup
Tests require an admin user for authentication. Create one using:

```bash
# From the be/ directory
npm run seed
```

Or manually create an admin user with:
- **Email**: `admin@example.com`
- **Password**: `Admin@123`
- **Role**: Admin with vehicle management permissions

### 3. Environment Variables
Ensure `.env` file contains:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
```

## Quick Start

### Run Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- vehicle.api.test.js

# Run tests with coverage
npm test -- --coverage
```

### Generate Test Report

```bash
# From the be/ directory
npm run test:report

# Or specify a feature name
npm run test:report vehicle-management
```

### Output

The script generates a comprehensive test report in markdown format:
- **Location**: `be/docs/TEST_REPORT_[FEATURE-NAME].md`
- **Format**: Markdown with tables and structured sections
- **Content**: Test cases, classifications, methodology, and results

## Report Structure

Each generated report includes:

### 1. Test Cases Table
- Test ID (TC-001, TC-002, etc.)
- Description
- Input
- Expected Output

### 2. Test Classification
- Integration Tests
- Negative Tests
- Security Tests
- Performance Tests

### 3. Functional Testing Summary
- Total test cases
- Distribution by category
- Expected pass rate
- Coverage metrics

### 4. Non-Functional Test Cases
- Performance considerations
- Security measures
- Edge case handling

### 5. Academic Report Content
- **Testing Methodology**: Formal description of testing approach
- **Functional Testing Results**: Detailed analysis of test execution

## Using in Academic Reports

The generated content is formatted for direct inclusion in academic project reports:

1. **Copy Section 5.1** → Your report's "Testing Methodology" section
2. **Copy Section 5.2** → Your report's "Testing Results" section
3. **Copy Test Cases Table** → Appendix or detailed testing section
4. **Copy Test Classification** → Testing strategy section

## Customization

To customize the report generation:

1. Edit `be/scripts/generate-test-report.js`
2. Modify the report template in `.kiro/steering/test-report-generation.md`
3. Adjust test classification logic in the script

## Example Usage

```bash
# 1. Seed database with admin user
npm run seed

# 2. Run tests to verify everything works
npm test

# 3. Generate report for vehicle management
npm run test:report vehicle-management

# Output: be/docs/TEST_REPORT_VEHICLE-MANAGEMENT.md
```

## Integration with Kiro

A Kiro hook is available to automatically generate reports:
- **Hook Name**: "Auto Generate Test Report"
- **Trigger**: User-triggered (manual)
- **Location**: `.kiro/hooks/auto-generate-test-report.json`

To use the hook:
1. Open Kiro command palette
2. Search for "Trigger Hook"
3. Select "Auto Generate Test Report"

## Notes

- Reports are generated based on test files in `be/src/tests/`
- Test descriptions are parsed from Jest test cases
- Classification is automatic based on test description keywords
- All content is formatted in formal academic English
- Tests use `[Integration]`, `[Negative]`, `[Security]`, `[Performance]` tags for accurate classification

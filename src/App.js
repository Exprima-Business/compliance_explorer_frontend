import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import DocumentScanner from './pages/DocumentScanner';
import Matrix from './pages/Matrix';
import { AuthProvider } from './contexts/AuthContext';
import { ClauseProvider } from './contexts/ClauseContext';
export default function App() {
    return (_jsxs(ThemeProvider, { theme: theme, children: [_jsx(CssBaseline, {}), _jsx(AuthProvider, { children: _jsx(Router, { children: _jsx(ClauseProvider, { children: _jsx(Layout, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/matrix", element: _jsx(Matrix, {}) }), _jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/document-scanner", element: _jsx(DocumentScanner, {}) })] }) }) }) }) })] }));
}

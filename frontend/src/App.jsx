import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Problems from './pages/Problems'
import ProblemDetail from './pages/ProblemDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Submissions from './pages/Submissions'
import SubmissionDetail from './pages/SubmissionDetail'
import Forums from './pages/Forums'
import ForumTopics from './pages/ForumTopics'
import TopicDetail from './pages/TopicDetail'
import NewTopic from './pages/NewTopic'
import Articles from './pages/Articles'
import ArticleDetail from './pages/ArticleDetail'
import NewArticle from './pages/NewArticle'
import Contests from './pages/Contests'
import ContestDetail from './pages/ContestDetail'
import Profile from './pages/Profile'
import Leaderboard from './pages/Leaderboard'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/problems/:id" element={<ProblemDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/submissions" element={<Submissions />} />
        <Route path="/submissions/:id" element={<SubmissionDetail />} />
        <Route path="/forums" element={<Forums />} />
        <Route path="/forums/:slug" element={<ForumTopics />} />
        <Route path="/topics/new" element={<NewTopic />} />
        <Route path="/topics/:id" element={<TopicDetail />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/articles/new" element={<NewArticle />} />
        <Route path="/articles/:id" element={<ArticleDetail />} />
        <Route path="/contests" element={<Contests />} />
        <Route path="/contests/:id" element={<ContestDetail />} />
        <Route path="/users/:id" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  )
}

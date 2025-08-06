// Required Packages
const express = require('express');
const app = express();
const path = require('path');
const User = require('./models/user');
const Resume = require('./models/resume');
const Company = require('./models/company');
const mongoose = require('mongoose');
const session = require('express-session');
const bcrypt = require('bcrypt');
const ejsMate = require('ejs-mate');
const flash = require('connect-flash');
const ExpressError = require('./utils/ExpressError');
const { v4: uuidv4 } = require('uuid');


// Database connection
mongoose.connect('mongodb://localhost:27017/ResumeScreeningSystem', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        console.log("connected to database successfully!!!")
    })
    .catch(err => {
        console.log("not connected!!!!")
        console.log(err)
    })

// set up view and public directory
app.engine('ejs', ejsMate)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))
app.use(express.static(path.join(__dirname, 'public')))

app.use(express.urlencoded({ extended: true }))

// session
app.use(session({
    secret: 'notagoodsecret',
    resave: 'false',
    saveUninitialized: 'true'
}))

// middleware
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
})

// functions
const requireLogin = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect('/login')
    }
    next()
}

const isAdmin = async (req, res, next) => {
    const foundAdmin = await User.findOne({ 'userId': req.session.user.userId });
    if (foundAdmin && foundAdmin.isAdmin) {
        next()
    }
}

const isUser = async (req, res, next) => {
    const foundUser = await User.findOne({ 'userId': req.session.user.userId });
    if (foundUser && !foundUser.isAdmin) {
        next()
    }
}

// routes
// home page
app.get('/', (req, res) => {
    res.render('home')
})

// authentication releted routes for both user and admin
app.get('/register', (req, res) => {
    res.render('users/register')
})

app.post('/register', async (req, res) => {
    const { password, username, email } = req.body
    const hash = await bcrypt.hash(password, 12)
    const user = new User({
        userId: uuidv4(),
        username,
        email,
        password: hash
    })
    await user.save()
    res.redirect('/login')
})

app.get('/login', (req, res) => {
    res.render('users/login')
})

app.post('/login', async (req, res) => {
    const { username, password } = req.body
    const foundUser = await User.findAndValidate(username, password)
    if (foundUser && foundUser.isAdmin) {
        req.session.user = foundUser
        res.redirect('/admin')
    }
    else if (foundUser && !foundUser.isAdmin) {
        req.session.user = foundUser
        res.redirect('/user')
    }
    else {
        res.redirect('/login')
    }
})

app.get('/logout', (req, res) => {
    req.session.destroy()
    res.redirect('/login')
})

// Users routes
app.get('/user', requireLogin, isUser, async (req, res) => {
    res.render('user')
})

app.get('/user/view-resume', requireLogin, isUser, async (req, res) => {
    const resumeData = await Resume.findOne({ 'userId': req.session.user.userId });
    res.render('show-resume', { resumeData })
})

// app.get('/fillresume', requireLogin, isUser, (req, res) => {
//     res.render('restemp')
// })

// app.post('/fillresume', requireLogin, isUser, async (req, res) => {
//     const newResume = new Resume(req.body)
//     newResume.userId = req.session.user.userId
//     await newResume.save()
//     res.redirect('/user')
// })

app.get('/fill-resume', requireLogin, isUser, (req, res) => {
    res.render('restemp')
})

app.post('/fill-resume', requireLogin, isUser, async (req, res) => {
    // const newCompany = new Company(req.body)
    // newCompany.companyId = uuidv4();
    // newCompany.userId = req.session.user.userId
    // await newCompany.save()
    // res.redirect('/admin')

    const newResume = new Resume(req.body)
    newResume.resumeId = uuidv4();
    newResume.userId = req.session.user.userId
    await newResume.save()
    res.redirect(`/resume/${newResume.resumeId}`)
})

app.get('/edit', requireLogin, isUser, async (req, res) => {
    const resume = await Resume.findOne({ 'userId': req.session.user.userId })
    if (!resume) {
        // req.flash('error', 'Cannot find that Resume!');
        return res.redirect('/user');
    }
    res.render('edit', { resume });
})

app.post('/edit', requireLogin, isUser, async (req, res) => {
    const resume = await Resume.findOneAndUpdate({ 'userId': req.session.user.userId }, { ...req.body });
    res.redirect('/user')
})

const url = require('url');

app.post('/applied-candidates', requireLogin, isUser, async (req, res) => {
    const companyData = await Company.findOne({ 'companyId': req.session.companyId })
    if (!companyData) {
        console.log("some problem is there")
    }
    companyData.applied_candidate.push(req.session.user.userId)
    await companyData.save()
    res.redirect(`/company/${req.session.companyId}`)
})

app.get('/feedback', requireLogin, isUser, async (req, res) => {
    const user = await User.findOne({ 'userId': req.session.user.userId });
    if (!user) {
        console.log("some problem is there")
    }
    res.render('feedback', { user });
})

app.get('/admin/view-status', requireLogin, isUser, async (req, res) => {
    const user = await User.findOne({ 'userId': req.session.user.userId });
    if (!user) {
        console.log("some problem is there")
    }
    res.render('company-feedback', { user });
})

// Admin Routes
app.get('/admin', requireLogin, isAdmin, async (req, res) => {
    res.render('admin')
})

app.get('/addcomp', requireLogin, isAdmin, (req, res) => {
    res.render('comptemp')
})

app.post('/addcomp', requireLogin, isAdmin, async (req, res) => {
    // const newCompany = new Company(req.body)
    // newCompany.companyId = uuidv4();
    // newCompany.userId = req.session.user.userId
    // await newCompany.save()
    // res.redirect('/admin')

    const newCompany = new Company(req.body)
    newCompany.companyId = uuidv4();
    newCompany.userId = req.session.user.userId
    await newCompany.save()
    res.redirect(`/company/${newCompany.companyId}`)
})

app.get('/editcomp', requireLogin, isAdmin, async (req, res) => {
    const company = await Company.findOne({ 'userId': req.session.user.userId })
    if (!company) {
        // req.flash('error', 'Cannot find that Resume!');
        return res.redirect('/admin');
    }
    res.render('comptempedit', { company });
})



app.post('/editcomp', requireLogin, isAdmin, async (req, res) => {
    const company = await Company.findOneAndUpdate({ 'userId': req.session.user.userId }, { ...req.body });
    res.redirect('/admin')
})

app.get('/admin/view-resumes', requireLogin, isAdmin, async (req, res) => {
    const resumeData = await Resume.find();
    res.render('resumes', { resumeData })
})

app.get('/admin/applied-candidate', requireLogin, isAdmin, async (req, res) => {
    const companyData = await Company.findOne({ 'companyId': req.session.companyId })
    applied_candidate = companyData.applied_candidate
    resumeData = []
    for (var i in applied_candidate) {
        var resume = await Resume.findOne({ 'userId': applied_candidate[i] })
        resumeData.push(resume);
    }
    res.render('applied-candidate', { resumeData });
})


// routes for both user and admin
app.get('/all-companies', requireLogin, async (req, res) => {
    const companyData = await Company.find();
    res.render('companies', { companyData })
})

app.get('/resume/:id', requireLogin, async (req, res) => {
    const resumeData = await Resume.findOne({ 'resumeId': req.params.id })
    if (!resumeData) {
        console.log("some problem is there")
    }
    res.render('show-resume', { resumeData });
})

app.get('/company/:id', requireLogin, async (req, res) => {
    const companyData = await Company.findOne({ 'companyId': req.params.id })
    if (!companyData) {
        console.log("some problem is there")
    }
    req.session.companyId = req.params.id;
    res.render('show-company', { companyData });
})

app.get('/admin/generate-dynamic-rank', requireLogin, isAdmin, async function (req, res) {
    const company = await Company.findOne({ 'companyId': req.session.companyId })
    applied_candidate = company.applied_candidate
    resumeData = []
    for (var i in applied_candidate) {
        var resume = await Resume.findOne({ 'userId': applied_candidate[i] })
        resumeData.push(resume);
    }
    var options = {
        method: 'POST',
        // http:flaskserverurl:port/route
        uri: 'http://127.0.0.1:5000/generate-dynamic-rank',
        // body: [job_description, resumes],
        body: [company, resumeData],
        // Automatically stringifies
        // the body to JSON
        json: true
    };

    var sendrequest = await request(options)
        // The parsedBody contains the data
        // sent back from the Flask server
        .then(async function (parsedBody) {
            var resumes = []
            var rank = []
            var score = []
            var i = 0
            var max_project = 0
            var min_project = 99
            var max_internship = 0
            var min_internship = 99
            var max_experience = 0
            var min_experience = 99
            var max_certification = 0
            var min_certification = 99
            var max_skill = 0
            var min_skill = 99
            for (const item of parsedBody) {
                // console.log(item)
                const field = item[0]
                var skill_count = item[1]
                const feedback = item[2]
                skill_count = Object.values(skill_count);
                skill_count = skill_count[0]
                // console.log(skill_count)
                if (skill_count > max_skill) {
                    max_skill = skill_count
                }
                if (skill_count < min_skill) {
                    min_skill = skill_count
                }
                // item.push({ noOfSkills: skill_count })
                // console.log(max_skill + " " + min_skill + " " + skill_count)
                var id = Object.values(field);
                id = id[0]
                resumes[i] = await Resume.findOne({ 'userId': id });
                // console.log(resumes[i])
                const noOfProjects = resumes[i].projects.length
                if (noOfProjects > max_project) {
                    max_project = noOfProjects
                }
                if (noOfProjects < min_project) {
                    min_project = noOfProjects
                }
                item.push({ noOfProjects: noOfProjects })
                var noOfInternships = resumes[i].internships.length
                if (resumes[i].internships.length === 0 || resumes[i].internships[0][0].length === 0) {
                    noOfInternships = 0;
                } else {
                    noOfInternships = noOfInternships
                }
                if (noOfInternships > max_internship) {
                    max_internship = noOfInternships
                }
                if (noOfInternships < min_internship) {
                    min_internship = noOfInternships
                }
                // console.log(noOfInternships)
                item.push({ noOfInternships: noOfInternships })
                var total_months;
                if (noOfInternships > 0) {
                    total_months = 0;
                    resumes[i].internships.forEach((internship) => {
                        const startDate = new Date(internship[0].split("/").reverse().join("-"));
                        const endDate = new Date(internship[1].split("/").reverse().join("-"));
                        const diffTime = Math.abs(endDate - startDate);
                        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                        total_months += diffMonths
                    });
                    total_months = total_months - 1;
                } else {
                    total_months = 0;
                }
                if (total_months > max_experience) {
                    max_experience = total_months
                }
                if (total_months < min_experience) {
                    min_experience = total_months
                }
                // console.log(total_months)
                item.push({ internshipExperience: total_months })
                var noOfCertifications = resumes[i].certifications.length
                if (resumes[i].certifications.length === 0 || resumes[i].certifications[0].length === 0) {
                    noOfCertifications = 0;
                } else {
                    noOfCertifications = noOfCertifications
                }
                if (noOfCertifications > max_certification) {
                    max_certification = noOfCertifications
                }
                if (noOfCertifications < min_certification) {
                    min_certification = noOfCertifications
                }
                // console.log(noOfCertifications)
                item.push({ noOfCertifications: noOfCertifications })
                score.push(item)
                i++;
            }
            for (let i = 0; i < score.length; i++) {
                let total = 0;
                let j;
                feed = []
                for (j = 0; j < score[i].length; j++) {
                    if (score[i][j].hasOwnProperty("skill_count")) {
                        t = ((score[i][j].skill_count - min_skill) / (max_skill - min_skill)) * (0.3 - 0.0)
                        total += ((score[i][j].skill_count - min_skill) / (max_skill - min_skill)) * (0.3 - 0.0)
                        if (t == 0) {
                            feed.push("Work on your skills.")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfProjects")) {
                        t = ((score[i][j].noOfProjects - min_project) / (max_project - min_project)) * (0.2 - 0.0)
                        total += ((score[i][j].noOfProjects - min_project) / (max_project - min_project)) * (0.2 - 0.0)
                        if (t == 0) {
                            feed.push("Work on Project.")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfInternships")) {
                        t = ((score[i][j].noOfInternships - min_internship) / (max_internship - min_internship)) * (0.1 - 0.0)
                        total += ((score[i][j].noOfInternships - min_internship) / (max_internship - min_internship)) * (0.1 - 0.0)
                    }
                    if (score[i][j].hasOwnProperty("internshipExperience")) {
                        t = ((score[i][j].internshipExperience - min_experience) / (max_experience - min_experience)) * (0.3 - 0.0)
                        total += ((score[i][j].internshipExperience - min_experience) / (max_experience - min_experience)) * (0.3 - 0.0)
                        if (t == 0) {
                            feed.push("Please Do an Internship")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfCertifications")) {
                        t = ((score[i][j].noOfCertifications - min_certification) / (max_certification - min_certification)) * (0.1 - 0.0)
                        total += ((score[i][j].noOfCertifications - min_certification) / (max_certification - min_certification)) * (0.1 - 0.0)
                        if (t == 0) {
                            feed.push("Do some certifications")
                        }
                    }
                }
                const user = await User.findOne({ 'userId': score[i][0].id });
                user.company_feedback = feed
                user.save();
                rank.push([{ "userId": score[i][0].id }, { "score": total }])
                console.log(total)
            }
            rank.sort((a, b) => b[1].score - a[1].score);
            // console.log(rank.length)
            ranked_resumes = [];
            const company = await Company.findOne({ 'companyId': req.session.companyId });
            const vacancies = company.vacancies - 1
            for (var i = 0; i < rank.length; i++) {
                // if (i >= rank.length) {
                //     break;
                // }
                const user = await User.findOne({ 'userId': rank[i][0].userId });
                if (i > vacancies) {
                    user["company_feedback"].unshift("Sorry, You are not selected. Please work on your resume.")
                    user.save();
                    continue;
                } else {
                    user.company_feedback = "Congratulations, you are selected."
                    user.save();
                }
                ranked_resumes[i] = await Resume.findOne({ 'userId': rank[i][0].userId });
            }
            // console.log(ranked_resumes)
            res.render('rank', { ranked_resumes })
        })
        .catch(function (err) {
            console.log(err);
        });
    // res.send("task completed")
});


// rank generation
var request = require('request-promise');
app.get('/admin/generate-static-rank', requireLogin, isAdmin, async function (req, res) {
    const resumes = await Resume.find()
    var options = {
        method: 'POST',
        // http:flaskserverurl:port/route
        uri: 'http://127.0.0.1:5000/generate-static-rank',
        // body: [job_description, resumes],
        body: [resumes],
        // Automatically stringifies
        // the body to JSON
        json: true
    };

    var sendrequest = await request(options)
        // The parsedBody contains the data
        // sent back from the Flask server
        .then(async function (parsedBody) {
            var resumes = []
            var rank = []
            var score = []
            var i = 0
            var max_project = 0
            var min_project = 99
            var max_internship = 0
            var min_internship = 99
            var max_experience = 0
            var min_experience = 99
            var max_certification = 0
            var min_certification = 99
            var max_skill = 0
            var min_skill = 99
            // console.log(parsedBody)
            for (const item of parsedBody) {
                // console.log(item)
                const field = item[0]
                var skill_count = item[1]
                const feedback = item[2]
                skill_count = Object.values(skill_count);
                skill_count = skill_count[0]
                // console.log(skill_count)
                if (skill_count > max_skill) {
                    max_skill = skill_count
                }
                if (skill_count < min_skill) {
                    min_skill = skill_count
                }
                // item.push({ noOfSkills: skill_count })
                var id = Object.values(field);
                id = id[0]
                resumes[i] = await Resume.findOne({ 'userId': id });
                // console.log(resumes[i])
                const noOfProjects = resumes[i].projects.length
                if (noOfProjects > max_project) {
                    max_project = noOfProjects
                }
                if (noOfProjects < min_project) {
                    min_project = noOfProjects
                }
                item.push({ noOfProjects: noOfProjects })
                var noOfInternships = resumes[i].internships.length
                if (resumes[i].internships.length === 0 || resumes[i].internships[0][0].length === 0) {
                    noOfInternships = 0;
                } else {
                    noOfInternships = noOfInternships
                }
                if (noOfInternships > max_internship) {
                    max_internship = noOfInternships
                }
                if (noOfInternships < min_internship) {
                    min_internship = noOfInternships
                }
                // console.log(noOfInternships)
                item.push({ noOfInternships: noOfInternships })
                var total_months;
                if (noOfInternships > 0) {
                    total_months = 0;
                    resumes[i].internships.forEach((internship) => {
                        const startDate = new Date(internship[0].split("/").reverse().join("-"));
                        const endDate = new Date(internship[1].split("/").reverse().join("-"));
                        const diffTime = Math.abs(endDate - startDate);
                        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
                        total_months += diffMonths
                    });
                    total_months = total_months - 1;
                } else {
                    total_months = 0;
                }
                if (total_months > max_experience) {
                    max_experience = total_months
                }
                if (total_months < min_experience) {
                    min_experience = total_months
                }
                // console.log(total_months)
                item.push({ internshipExperience: total_months })
                var noOfCertifications = resumes[i].certifications.length
                if (resumes[i].certifications.length === 0 || resumes[i].certifications[0].length === 0) {
                    noOfCertifications = 0;
                } else {
                    noOfCertifications = noOfCertifications
                }
                if (noOfCertifications > max_certification) {
                    max_certification = noOfCertifications
                }
                if (noOfCertifications < min_certification) {
                    min_certification = noOfCertifications
                }
                // console.log(noOfCertifications)
                item.push({ noOfCertifications: noOfCertifications })
                score.push(item)
                i++;
            }
            // console.log(max_skill + " " + min_skill)
            // console.log(max_project + " " + min_project)
            // console.log(max_internship + " " + min_internship)
            // console.log(max_experience + " " + min_experience)
            // console.log(max_certification + " " + min_certification)
            // console.log(score)
            for (let i = 0; i < score.length; i++) {
                feed = []
                let total = 0;
                let j;
                for (j = 0; j < score[i].length; j++) {
                    if (score[i][j].hasOwnProperty("skill_count")) {
                        t = ((score[i][j].skill_count - min_skill) / (max_skill - min_skill)) * (0.3 - 0.0)
                        total += ((score[i][j].skill_count - min_skill) / (max_skill - min_skill)) * (0.3 - 0.0)
                        if (t == 0) {
                            feed.push("Work on your skills.")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfProjects")) {
                        t = ((score[i][j].noOfProjects - min_project) / (max_project - min_project)) * (0.2 - 0.0)
                        total += ((score[i][j].noOfProjects - min_project) / (max_project - min_project)) * (0.2 - 0.0)
                        if (t == 0) {
                            feed.push("Work on projects.")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfInternships")) {
                        t = ((score[i][j].noOfInternships - min_internship) / (max_internship - min_internship)) * (0.1 - 0.0)
                        total += ((score[i][j].noOfInternships - min_internship) / (max_internship - min_internship)) * (0.1 - 0.0)
                        // if(t == 0){
                        //     feed.append("Please Do an Internship.")
                        // }
                    }
                    if (score[i][j].hasOwnProperty("internshipExperience")) {
                        t = ((score[i][j].internshipExperience - min_experience) / (max_experience - min_experience)) * (0.3 - 0.0)
                        total += ((score[i][j].internshipExperience - min_experience) / (max_experience - min_experience)) * (0.3 - 0.0)
                        if (t == 0) {
                            feed.push("Please Do an Internship.")
                        }
                    }
                    if (score[i][j].hasOwnProperty("noOfCertifications")) {
                        t = ((score[i][j].noOfCertifications - min_certification) / (max_certification - min_certification)) * (0.1 - 0.0)
                        total += ((score[i][j].noOfCertifications - min_certification) / (max_certification - min_certification)) * (0.1 - 0.0)
                        if (t == 0) {
                            feed.push("Please Do some certifications.")
                        }
                    }
                }
                // console.log(feed)
                const user = await User.findOne({ 'userId': score[i][0].id });
                user.feedback = feed
                user.save();
                rank.push([{ "userId": score[i][0].id }, { "score": total }])
                // console.log(total)
            }
            rank.sort((a, b) => b[1].score - a[1].score);
            ranked_resumes = [];
            for (var i = 0; i < rank.length; i++) {
                ranked_resumes[i] = await Resume.findOne({ 'userId': rank[i][0].userId });
            }
            // console.log(ranked_resumes)
            // console.log(rank)
            res.render('rank', { ranked_resumes })
        })
        .catch(function (err) {
            console.log(err);
        });
    // res.send("task completed")
});

app.listen(7000, () => {
    console.log("SERVING YOUR APP!")
})


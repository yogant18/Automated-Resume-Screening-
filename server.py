from nltk.tokenize import RegexpTokenizer, word_tokenize
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from nltk.cluster import util
from flask import Flask, request
import string
import pandas as pd
import nltk

# Download necessary NLTK resources
nltk.download('punkt')
nltk.download(
    'stopwords', download_dir='C:\\Users\\Yogant\\AppData\\Roaming\\nltk_data')
nltk.download('wordnet')

# Create a tokenizer
tokenizer = RegexpTokenizer(r'\w+')

# Add NLTK data path (if necessary)
# import nltk
# nltk.data.path.append("<path_to_nltk_data>")


# Read the CSV file into a DataFrame
df = pd.read_csv('new-updated-dataset.csv')

# Setup flask server
app = Flask(__name__)


@app.route('/generate-dynamic-rank', methods=['POST'])
def rank_generator():
    data = request.get_json()
    job_description = data[0]
    jobd_vector = []
    skills = tokenizer.tokenize(job_description['skills'])
    jobd_vector = jobd_vector + skills
    description = tokenizer.tokenize(job_description['description'])
    jobd_vector = jobd_vector + description
    new_jobd = [x.lower() for x in jobd_vector]
    # Removing stopwords and punctuation marks
    stop_words = set(stopwords.words('english'))
    filtered_new_jobd = [token for token in new_jobd if token.lower(
    ) not in stop_words and token not in string.punctuation]
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_new_jobd = [lemmatizer.lemmatize(
        token) for token in filtered_new_jobd]

    # resume vector
    score = []
    resumes = data[1]
    resume_vector = []
    result = []
    for resume in resumes:
        list = []
        skills = tokenizer.tokenize(resume['skill'])
        resume_vector = resume_vector + skills
        for project in resume['projects']:
            project_token = tokenizer.tokenize(project)
            resume_vector = resume_vector + project_token
        for certification in resume['certifications']:
            certification_token = tokenizer.tokenize(certification)
            resume_vector = resume_vector + certification_token
        for internship in resume['internships']:
            for intern in internship:
                internship_token = tokenizer.tokenize(intern)
                resume_vector = resume_vector + internship_token
        # unique_tokens = set(resume_vector).union(set(jobd_vector))
        new_resume = [x.lower() for x in resume_vector]
        # Removing stopwords and punctuation marks
        stop_words = set(stopwords.words('english'))
        filtered_new_resume = [token for token in new_resume if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_new_resume = [lemmatizer.lemmatize(
            token) for token in filtered_new_resume]
        count = 0
        for sk in lemmatized_new_jobd:
            if sk in lemmatized_new_resume:
                count = count+1
        list.append({'id': resume['userId']})
        list.append({'skill_count': count})
        if (count < 5):
            list.append({'feedback': 'need to work on skills'})
        else:
            list.append({'feedback': 'profile looks good'})
        score.append(list)
    # print(score)
    # Define a function to split the Skills column into a list of skills

    def split_skills(row):
        return row.split(',')

    # Apply the split_skills function to the Skills column and concatenate the lists
    skil = df['Skills'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_skil = [lemmatizer.lemmatize(
        token) for token in skil]

    proj = df['Project'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_proj = [lemmatizer.lemmatize(
        token) for token in proj]

    interns = df['Internship'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_interns = [lemmatizer.lemmatize(
        token) for token in interns]

    certi = df['Certification'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_certi = [lemmatizer.lemmatize(
        token) for token in certi]

    tokenized_resume = []
    for resume in resumes:
        skills = tokenizer.tokenize(resume['skill'])
        # Removing stopwords and punctuation marks
        stop_words = set(stopwords.words('english'))
        filtered_skills = [token for token in skills if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_skills = [lemmatizer.lemmatize(
            token) for token in filtered_skills]

        projects = []
        for project in resume['projects']:
            project_token = tokenizer.tokenize(project)
            projects = projects + project_token
        stop_words = set(stopwords.words('english'))
        filtered_projects = [token for token in projects if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_projects = [lemmatizer.lemmatize(
            token) for token in filtered_projects]

        certifications = []
        for certification in resume['certifications']:
            certification_token = tokenizer.tokenize(certification)
            certifications = certifications + certification_token
        stop_words = set(stopwords.words('english'))
        filtered_certifications = [token for token in certifications if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_certifications = [lemmatizer.lemmatize(
            token) for token in filtered_certifications]

        internships = []
        for internship in resume['internships']:
            for intern in internship:
                internship_token = tokenizer.tokenize(intern)
                internships = internships + internship_token
        stop_words = set(stopwords.words('english'))
        filtered_internships = [token for token in internships if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_internships = [lemmatizer.lemmatize(
            token) for token in filtered_internships]
        result = {'userId': resume['userId'],
                  'skill': lemmatized_skills, 'project': lemmatized_projects, 'certification': lemmatized_certifications, 'internship': lemmatized_internships}
        tokenized_resume.append(result)

    score_resume = []
    for resume in tokenized_resume:
        list = []
        count = 0
        for sk in resume['skill']:
            if sk.lower() in lemmatized_new_jobd:
                count = count+1
        for pr in resume['project']:
            if pr.lower() in lemmatized_proj:
                count = count+1
        for cr in resume['certification']:
            if cr.lower() in lemmatized_certi:
                count = count+1
        for ip in resume['internship']:
            if ip.lower() in lemmatized_interns:
                count = count+1
        list.append({'id': resume['userId']})
        list.append({'skill_count': count})
        if (count < 5):
            list.append({'feedback': 'need to work on skills'})
        else:
            list.append({'feedback': 'profile looks good'})
        score_resume.append(list)
    print(score_resume)
    return score
    # vec1 = [1 if token in resume_vector else 0 for token in unique_tokens]
    # vec2 = [1 if token in jobd_vector else 0 for token in unique_tokens]

    # similarity = 1 - util.cosine_distance(vec1, vec2)
    # result.append({'userId': resume['userId'], 'similarity': similarity})

    # sorted_data = sorted(result, key=lambda x: x['similarity'], reverse=True)
    # print(sorted_data)
    # return sorted_data


@app.route('/generate-static-rank', methods=['POST'])
def static_rank_generator():
    # Define a function to split the Skills column into a list of skills
    def split_skills(row):
        return row.split(',')

    # Apply the split_skills function to the Skills column and concatenate the lists
    skil = df['Skills'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_skil = [lemmatizer.lemmatize(
        token) for token in skil]

    proj = df['Project'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_proj = [lemmatizer.lemmatize(
        token) for token in proj]

    interns = df['Internship'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_interns = [lemmatizer.lemmatize(
        token) for token in interns]

    certi = df['Certification'].apply(split_skills).sum()
    # Lemmatization
    lemmatizer = WordNetLemmatizer()
    lemmatized_certi = [lemmatizer.lemmatize(
        token) for token in certi]

    data = request.get_json()
    resumes = data[0]

    tokenized_resume = []
    for resume in resumes:
        skills = tokenizer.tokenize(resume['skill'])
        # Removing stopwords and punctuation marks
        stop_words = set(stopwords.words('english'))
        filtered_skills = [token for token in skills if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_skills = [lemmatizer.lemmatize(
            token) for token in filtered_skills]

        projects = []
        for project in resume['projects']:
            project_token = tokenizer.tokenize(project)
            projects = projects + project_token
        stop_words = set(stopwords.words('english'))
        filtered_projects = [token for token in projects if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_projects = [lemmatizer.lemmatize(
            token) for token in filtered_projects]

        certifications = []
        for certification in resume['certifications']:
            certification_token = tokenizer.tokenize(certification)
            certifications = certifications + certification_token
        stop_words = set(stopwords.words('english'))
        filtered_certifications = [token for token in certifications if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_certifications = [lemmatizer.lemmatize(
            token) for token in filtered_certifications]

        internships = []
        for internship in resume['internships']:
            for intern in internship:
                internship_token = tokenizer.tokenize(intern)
                internships = internships + internship_token
        stop_words = set(stopwords.words('english'))
        filtered_internships = [token for token in internships if token.lower(
        ) not in stop_words and token not in string.punctuation]
        # Lemmatization
        lemmatizer = WordNetLemmatizer()
        lemmatized_internships = [lemmatizer.lemmatize(
            token) for token in filtered_internships]
        result = {'userId': resume['userId'],
                  'skill': lemmatized_skills, 'project': lemmatized_projects, 'certification': lemmatized_certifications, 'internship': lemmatized_internships}
        tokenized_resume.append(result)

    score = []
    for resume in tokenized_resume:
        list = []
        count = 0
        for sk in resume['skill']:
            if sk.lower() in lemmatized_skil:
                count = count+1
        for pr in resume['project']:
            if pr.lower() in lemmatized_proj:
                count = count+1
        for cr in resume['certification']:
            if cr.lower() in lemmatized_certi:
                count = count+1
        for ip in resume['internship']:
            if ip.lower() in lemmatized_interns:
                count = count+1
        list.append({'id': resume['userId']})
        list.append({'skill_count': count})
        if (count < 5):
            list.append({'feedback': 'need to work on skills'})
        else:
            list.append({'feedback': 'profile looks good'})
        score.append(list)

    # print(score)
    return score


if __name__ == "__main__":
    app.run(port=5000)

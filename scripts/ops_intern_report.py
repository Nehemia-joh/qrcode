import urllib.request
import json 
from pathlib import Path

def url_ops_status(url):
    try:
        response = urllib.request.urlopen(url, timeout=3)
        if response.status:
            return "UP"
        return "DOWN"    
    
    except Exception as error :
        print(f"{error}, occurred in url ")
        return "DOWN"

# reading the data from the json file     
def get_students_in_credit():
    with open('../data/sample_students.json', 'r') as data:
        data = json.load(data)
        students_in_credit = []
       
        for student in data:
            student["balance"] 
            if student["balance"] < 0:
                students_in_credit.append(student)
              
        total_students = len(data)
        sum_of_students_in_credit = len(students_in_credit) 
        names_of_student_in_credit =[s["full_name"] for s in students_in_credit]
        Total_balance = sum(s["balance"] for s in data)

        return total_students,sum_of_students_in_credit,names_of_student_in_credit,Total_balance


if __name__ == "__main__":
    total_students,sum_of_students_in_credit,names_of_student_in_credit,Total_balance =get_students_in_credit()
    report=f"""Irene Musau

    Total students: {total_students}
    Students in credit (overdue): {sum_of_students_in_credit}
    Names of in-credit students: {names_of_student_in_credit}
    Total balance: {Total_balance}
    """
    print(report)
    out_path = Path(__file__).resolve().parent.parent / "docs" / "intern-submissions" / "irene-musau-report.txt"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(report)

    response = url_ops_status("http://localhost:4000/api/health")
    print(response)
        
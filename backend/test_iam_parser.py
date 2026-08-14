import json

from backend.parser.iam_parser import _strip_comments, parse_iam_policy


def test_strip_comments_preserves_markers_inside_strings():
    document = '''{
      // leading comment
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": "s3:GetObject",
        "Resource": "https://example.com/a/*literal*/b//value"
      }] /* trailing comment */
    }'''

    cleaned = _strip_comments(document)
    parsed = json.loads(cleaned)

    assert parsed["Statement"][0]["Resource"] == "https://example.com/a/*literal*/b//value"


def test_comment_heavy_policy_parses_without_regex_backtracking():
    comments = "".join(f"/* comment {index} */" for index in range(5_000))
    document = comments + '''{
      "Version": "2012-10-17",
      "Statement": [{
        "Effect": "Allow",
        "Action": "s3:GetObject",
        "Resource": "*"
      }]
    }'''

    rules = parse_iam_policy(document)

    assert len(rules) == 1
    assert rules[0].effect == "Allow"

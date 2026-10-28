i need to creat a simple Angular-22 component that will build a dynamic form based on a json object. The json object will have a list of fields with their properties such as type, label, name, required, display, default_value, dissable etc. The component should be able to render the form fields based on the json object and handle form submission.

The json object should came from calling a service that will fetch the data from a backend api (A).
Here is an example of the json object:

```
{
  "fields": [
    {
      "type": "text",
      "label": "Name",
      "name": "name",
      "required": true,
      "display": true,
      "default_value": "",
      "disable": false
    },
  ]
}

Then should be an open channel between the component and other api (B) to send the form data on any change on form.

Service (B) should detect any change in default values that came from service (A).

On submit if there are any changes between diabled fields default values and values return in service (A) the component should show a warning message to the user.